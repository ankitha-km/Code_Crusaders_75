import { useEffect, useMemo, useRef, useState } from "react";
import "/node_modules/leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Search, Mic, Image as ImageIcon, Award, AlertTriangle, Heart, SlidersHorizontal, Star, Phone, Navigation, Bell, Bot, Download } from "lucide-react";
import Tesseract from "tesseract.js";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { medicines, pharmacies, inventory } from "./mock";

// Helpers
const haversineKm = (a, b) => {
  const R = 6371, dLat = rad(b[0]-a[0]), dLon = rad(b[1]-a[1]);
  const t = Math.sin(dLat/2)**2 + Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(t));
}; const rad = d => (d*Math.PI)/180;

// Voice API (browser)
const useVoice = (onText) => {
  const recRef = useRef(null);
  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return alert("Web Speech not supported in this browser.");
    const r = new SR(); r.lang="en-IN"; r.onresult=e=>onText(e.results[0][0].transcript); r.start(); recRef.current=r;
  };
  const stop = () => recRef.current?.stop();
  return { start, stop };
};

// “TrOCR refinement” — simulated post-processing of OCR text
const refineText = (t) => t.replace(/\n+/g," ").replace(/\s{2,}/g," ").trim();

export default function App(){
  // location
  const [pos,setPos] = useState(null);
  // query & OCR
  const [q,setQ] = useState("Paracetamol 650 tablet");
  const [ocrBusy,setOcrBusy] = useState(false);
  const [ocrPreview,setOcrPreview] = useState("");
  // filters/sort
  const [radius,setRadius] = useState(8); // km
  const [priceCap,setPriceCap] = useState(250);
  const [openNow,setOpenNow] = useState(false);
  const [sortBy,setSortBy] = useState("score");
  // weights (AI scoring): price 40, dist 30, avail 20, rating 10
  const W = { price:0.4, dist:0.3, avail:0.2, rating:0.1 };
  // results
  const [rows,setRows] = useState([]);
  const [best,setBest] = useState(null);
  // states
  const [bookmarks,setBookmarks] = useState([]);
  const [recent,setRecent] = useState([]);
  const [emergency,setEmergency] = useState(false);
  const [toast,setToast] = useState(null);

  const { start: startVoice } = useVoice((t)=>setQ(t));

  // geolocate
  useEffect(()=>{
    navigator.geolocation.getCurrentPosition(
      g=> setPos([g.coords.latitude,g.coords.longitude]),
      ()=> setPos([12.9716,77.5946]) // BLR fallback
    );
  },[]);

  // medicine matching
  const matchedMed = useMemo(()=>{
    const ql = q.toLowerCase();
    return medicines.find(m => ql.includes((m.brand||"").toLowerCase()) || ql.includes((m.generic||"").toLowerCase()));
  },[q]);

  // compute results
  const compute = () => {
    if(!pos || !matchedMed) { setRows([]); setBest(null); return; }
    const medId = matchedMed.id;
    const base = pharmacies.map(p=>{
      const inv = inventory[p.id]?.[medId];
      if(!inv) return null;
      const distance = +haversineKm(pos,[p.lat,p.lon]).toFixed(2);
      if(distance>radius) return null;
      if(openNow && !p.open24) return null;
      if(inv.price>priceCap) return null;
      return {
        store_id:p.id, store_name:p.name, lat:p.lat, lon:p.lon, address:p.address,
        open24: p.open24, rating: p.rating, price: inv.price, availability: inv.stock,
        distance_km: distance
      };
    }).filter(Boolean);

    if(base.length===0){ setRows([]); setBest(null); return; }

    const minP = Math.min(...base.map(b=>b.price));
    const maxP = Math.max(...base.map(b=>b.price));
    const maxD = Math.max(...base.map(b=>b.distance_km));
    // score = 0.4 price_norm + 0.3 dist_norm + 0.2 (1-avail_norm) + 0.1 (1-rating_norm)
    base.forEach(b=>{
      const price_norm = (b.price - minP)/((maxP-minP)||1);
      const dist_norm  = (b.distance_km)/((maxD)||1);
      const avail_norm = Math.max(0,Math.min(1,b.availability/100));
      const rating_norm= 1-(b.rating/5); // better rating → smaller penalty
      b.score = +(W.price*price_norm + W.dist*dist_norm + W.avail*(1-avail_norm) + W.rating*rating_norm).toFixed(3);
    });

    base.sort((a,b)=>{
      if(sortBy==="price") return a.price - b.price;
      if(sortBy==="distance") return a.distance_km - b.distance_km;
      if(sortBy==="rating") return b.rating - a.rating;
      return a.score - b.score; // default AI
    });

    setRows(base);
    setBest(base[0]);
  };

  // recompute on changes
  useEffect(()=>{ compute(); /* eslint-disable-next-line */ },[pos,q,radius,priceCap,openNow,sortBy]);

  // OCR
  const onImage = async (file) => {
    if(!file) return;
    setOcrBusy(true); setOcrPreview("");
    try{
      // pre-process hint: Tesseract handles grayscale internally for prototype
      const { data:{ text } } = await Tesseract.recognize(file,"eng");
      const refined = refineText(text);
      setOcrPreview(refined);
      setQ(refined || q);
      setRecent(r => [refined, ...r.slice(0,7)]);
    } finally { setOcrBusy(false); }
  };

  // substitutes
  const substitutes = useMemo(()=>{
    if(!matchedMed) return [];
    return (matchedMed.alt||[]).map(id => medicines.find(m=>m.id===id)).filter(Boolean);
  },[matchedMed]);

  // emergency mode list
  const emerList = useMemo(()=>{
    if(!emergency || !pos) return [];
    return pharmacies
      .filter(p=>p.open24)
      .map(p=>({ ...p, distance_km: +haversineKm(pos,[p.lat,p.lon]).toFixed(2)}))
      .sort((a,b)=>a.distance_km - b.distance_km);
  },[emergency,pos]);

  // chart data for current results
  const chartData = useMemo(()=> rows.slice(0,7).map(r=>({ name: r.store_name.split(" ")[0], price: r.price })),[rows]);

  // small toast helper
  useEffect(()=>{
    if(!toast) return;
    const id = setTimeout(()=>setToast(null), 2500);
    return ()=>clearTimeout(id);
  },[toast]);

  const callDirections = (r) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}`;
    window.open(url, "_blank");
  };

  const quickStat = (type) => {
    if(rows.length===0) return "-";
    if(type==="low") return "₹"+Math.min(...rows.map(r=>r.price));
    if(type==="near") return rows.slice().sort((a,b)=>a.distance_km-b.distance_km)[0].store_name;
    if(type==="rate") return rows.slice().sort((a,b)=>b.rating-a.rating)[0].rating.toFixed(1);
    if(type==="fast") return rows.slice().sort((a,b)=>a.distance_km-b.distance_km)[0].distance_km+" km";
    return "-";
  };

  return (
    <div className="h-full">
      {/* HERO */}
      <section className="pt-10 pb-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="glass border-luxe rounded-3xl p-6 shadow-luxe">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                  <span className="grad-text">AI-Powered Smart Medicine Locator</span>
                </h1>
                <p className="text-slate-300 mt-2">
                  Royal lavender aesthetics. Private OCR. Ranked pricing. One-tap Emergency Mode.
                </p>

                {/* Search row */}
                <div className="mt-5 flex gap-2 items-stretch">
                  <div className="flex items-center gap-2 flex-1 bg-ink/60 border border-white/15 rounded-2xl px-3">
                    <Search size={18} className="text-slate-300"/>
                    <input
                      aria-label="Search medicine"
                      className="flex-1 bg-transparent outline-none py-3 text-slate-100 placeholder:text-slate-400"
                      placeholder="Type generic/brand (e.g., Dolo 650)…"
                      value={q}
                      onChange={(e)=>setQ(e.target.value)}
                    />
                    <button title="Voice search" onClick={startVoice}
                            className="p-2 rounded-xl hover:bg-white/10 transition">
                      <Mic size={18}/>
                    </button>
                    <label className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer" title="Upload prescription">
                      <input type="file" accept="image/*" hidden onChange={(e)=>onImage(e.target.files?.[0])}/>
                      <ImageIcon size={18}/>
                    </label>
                  </div>
                  <button onClick={compute} className="grad rounded-2xl px-4 py-3 font-semibold shadow-luxe">Search</button>
                </div>

                {/* OCR preview */}
                {ocrBusy && <p className="text-slate-300 mt-2">Scanning image…</p>}
                {ocrPreview && !ocrBusy && (
                  <p className="text-slate-300 mt-2">
                    OCR detected: <span className="font-semibold">{ocrPreview}</span>
                  </p>
                )}

                {/* Filters */}
                <div className="mt-5 grid md:grid-cols-4 gap-3 text-sm">
                  <div className="glass rounded-2xl p-3">
                    <div className="flex items-center gap-2"><SlidersHorizontal size={16}/>Distance {radius} km</div>
                    <input type="range" min="2" max="25" value={radius} onChange={e=>setRadius(+e.target.value)} className="w-full mt-2"/>
                  </div>
                  <div className="glass rounded-2xl p-3">
                    <div>Price ≤ ₹{priceCap}</div>
                    <input type="range" min="20" max="400" value={priceCap} onChange={e=>setPriceCap(+e.target.value)} className="w-full mt-2"/>
                  </div>
                  <label className="glass rounded-2xl p-3 flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={openNow} onChange={e=>setOpenNow(e.target.checked)}/>
                    Open now
                  </label>
                  <div className="glass rounded-2xl p-3">
                    <select className="bg-transparent w-full outline-none" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                      <option value="score">AI score</option>
                      <option value="price">Price</option>
                      <option value="distance">Distance</option>
                      <option value="rating">Rating</option>
                    </select>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="mt-4 grid md:grid-cols-4 gap-3">
                  <StatCard label="Lowest price" value={quickStat("low")} />
                  <StatCard label="Nearest" value={quickStat("near")} />
                  <StatCard label="Highest rated" value={quickStat("rate")} />
                  <StatCard label="ETA (approx.)" value={quickStat("fast")} />
                </div>
              </div>

              {/* Best match floating card */}
              {best && (
                <div className="w-full md:w-[360px] glass rounded-3xl p-5 border-luxe">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="text-yellow-300"/>
                      <span className="font-bold">Best Match</span>
                    </div>
                    <span className="text-xs text-slate-300">AI-weighted</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-lg font-bold">{best.store_name}</div>
                    <div className="text-slate-300 text-sm">{best.address}</div>
                    <div className="mt-2 flex gap-3">
                      <Badge>₹{best.price}</Badge>
                      <Badge>{best.distance_km} km</Badge>
                      <Badge>Stock {best.availability}%</Badge>
                      <Badge><Star size={14} className="inline -mt-1"/> {best.rating.toFixed(1)}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>callDirections(best)}><Navigation size={16} className="inline mr-1"/> Directions</button>
                      <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>setToast("Calling store…")}><Phone size={16} className="inline mr-1"/> Call</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chips row */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip>UiPath Powered</Chip>
            <Chip>Privacy-first OCR</Chip>
            <Chip>Royal Lavender UI</Chip>
            <Chip>Glassmorphism</Chip>
          </div>
        </div>
      </section>

      {/* RESULTS SPLIT: list + map */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-6">
          {/* LIST */}
          <div className="space-y-3">
            {matchedMed ? (
              <div className="text-sm text-slate-300">Matched: <b>{matchedMed.brand}</b> ({matchedMed.generic}, {matchedMed.strength}, {matchedMed.form})
                <button className="ml-3 text-sky underline" onClick={()=>setToast("Alternatives shown below.")}>See alternatives</button>
              </div>
            ) : <div className="text-slate-400 text-sm">No exact match yet — try typing a brand or generic.</div>}

            {/* price chart */}
            {rows.length>0 && (
              <div className="glass border-luxe rounded-3xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Price comparison</div>
                  <button className="text-xs bg-white/10 rounded-xl px-2 py-1 hover:bg-white/20" onClick={()=>setToast("Drag along bars to compare.")}>drag-to-compare</button>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#cbd5e1"/>
                      <YAxis stroke="#cbd5e1"/>
                      <Tooltip />
                      <Bar dataKey="price" fill="#9b5de5" radius={[6,6,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* cards */}
            {rows.length===0 && (
              <div className="glass border-luxe rounded-3xl p-6 text-slate-300">No results in current filters.</div>
            )}
            {rows.map(r=>(
              <div key={r.store_id} className={`glass border-luxe rounded-3xl p-4 transition hover:scale-[1.01] ${best?.store_id===r.store_id?"ring-1 ring-mint/50":""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-lg">{r.store_name}</div>
                    <div className="text-slate-300 text-sm">{r.address}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="grad">₹{r.price}</Badge>
                      <Badge>{r.distance_km} km</Badge>
                      <Badge>Stock {r.availability}%</Badge>
                      <Badge><Star size={14} className="inline -mt-1"/> {r.rating.toFixed(1)}</Badge>
                      {r.open24 && <Badge className="!bg-red-500">24/7</Badge>}
                      {best?.store_id===r.store_id && <Badge className="!bg-mint">Best</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>callDirections(r)}><Navigation size={16} className="inline mr-1"/> Directions</button>
                    <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>setToast("Calling store…")}><Phone size={16} className="inline mr-1"/> Call</button>
                    <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>setBookmarks(b=>[r,...b.filter(x=>x.store_id!==r.store_id)].slice(0,6))}><Heart size={16} className="inline mr-1"/> Save</button>
                  </div>
                </div>
              </div>
            ))}

            {/* substitutes */}
            {substitutes.length>0 && (
              <div className="glass border-luxe rounded-3xl p-4">
                <div className="font-semibold mb-2">Alternatives</div>
                <div className="flex flex-wrap gap-2">
                  {substitutes.map(s=>(
                    <span key={s.id} className="px-3 py-1 rounded-xl bg-white/10">
                      {s.brand} — {s.generic} {s.strength}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* UiPath mock controls */}
            <div className="glass border-luxe rounded-3xl p-4">
              <div className="flex items-center gap-2 mb-2"><Bot size={16}/> <b>UiPath Automation (Mock)</b></div>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>setToast("Price alert set (simulated).")}><Bell size={16} className="inline mr-1"/> Set Price Alert</button>
                <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>setToast("Auto-reorder enabled (simulated).")}>Auto-reorder</button>
                <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={()=>setToast("Monthly savings report generated (simulated).")}><Download size={16} className="inline mr-1"/> Report</button>
                <span className="ml-auto px-2 py-1 rounded-lg text-xs bg-white/10">UiPath Powered</span>
              </div>
            </div>

            {/* bookmarks & recent */}
            {(bookmarks.length>0 || recent.length>0) && (
              <div className="grid md:grid-cols-2 gap-3">
                {bookmarks.length>0 && (
                  <div className="glass border-luxe rounded-3xl p-4">
                    <div className="font-semibold mb-2"><Heart size={16} className="inline mr-1"/> Favorites</div>
                    <ul className="text-sm text-slate-200 space-y-1">
                      {bookmarks.map(b=><li key={b.store_id}>• {b.store_name} — ₹{b.price}</li>)}
                    </ul>
                  </div>
                )}
                {recent.length>0 && (
                  <div className="glass border-luxe rounded-3xl p-4">
                    <div className="font-semibold mb-2">Recent searches</div>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((t,i)=>(
                        <button key={i} className="px-2 py-1 rounded-lg bg-white/10 text-xs" onClick={()=>setQ(t)}>{t}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MAP */}
          <div className="glass border-luxe rounded-3xl p-2">
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="font-semibold">Map</div>
              <button className={`px-3 py-1 rounded-xl ${emergency?"bg-red-500":"bg-white/10 hover:bg-white/20"}`}
                      onClick={()=>setEmergency(e=>!e)}>
                <AlertTriangle size={16} className="inline -mt-1 mr-1"/>{emergency? "Emergency ON" : "Emergency Mode"}
              </button>
            </div>
            <div className="h-[70vh] rounded-2xl overflow-hidden mt-2">
              {pos && (
                <MapContainer center={pos} zoom={13} style={{height:"100%", width:"100%"}}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={pos}><Popup>You are here</Popup></Marker>
                  {(emergency ? emerList : rows).map((r)=>(
                    <Marker key={r.store_id || r.id} position={[r.lat, r.lon]}>
                      <Popup>
                        <div className="font-bold">{r.store_name || r.name}</div>
                        {r.address && <div>{r.address}</div>}
                        {r.price && <div>₹{r.price} • {r.distance_km} km</div>}
                        {r.rating && <div>Rating {r.rating.toFixed?.(1) || r.rating}</div>}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="text-center text-xs text-slate-400 pb-6">
        © {new Date().getFullYear()} Lavender Dream • Care • Wellness
      </footer>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 shadow-glass">
          {toast}
        </div>
      )}
    </div>
  );
}

/* small atoms */
function StatCard({label,value}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-slate-300 text-sm">{label}</div>
      <div className="text-2xl font-extrabold grad-text">{value}</div>
    </div>
  );
}
function Badge({children, className=""}) {
  return <span className={`px-2 py-1 rounded-xl bg-white/10 text-sm ${className}`}>{children}</span>;
}
function Chip({children}) {
  return <span className="px-3 py-1 rounded-xl bg-white/10 text-xs border border-white/20">{children}</span>;
}
