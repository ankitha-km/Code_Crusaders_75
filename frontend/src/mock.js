// ------------------------------------------------------
// 🧠 MOCK DATA for Smart Medicine Locator (Lavender Dream)
// ------------------------------------------------------

export const medicines = [
  { id: 1, brand: "Dolo", generic: "Paracetamol", strength: "650 mg", form: "tablet",
    usage: "Fever & mild pain", side: "Nausea, rash (rare)", alt: [3, 4] },
  { id: 2, brand: "Crocin", generic: "Paracetamol", strength: "500 mg", form: "tablet",
    usage: "Fever & mild pain", side: "Nausea", alt: [1, 4] },
  { id: 3, brand: "Azithral", generic: "Azithromycin", strength: "500 mg", form: "tablet",
    usage: "Bacterial infections", side: "GI upset", alt: [5] },
  { id: 4, brand: "Zithrox", generic: "Azithromycin", strength: "250 mg", form: "tablet",
    usage: "Bacterial infections", side: "GI upset", alt: [3] },
  { id: 5, brand: "Allegra", generic: "Fexofenadine", strength: "120 mg", form: "tablet",
    usage: "Allergy relief", side: "Drowsiness (rare)", alt: [] },
  { id: 6, brand: "Augmentin", generic: "Amoxicillin+Clavulanic Acid", strength: "625 mg", form: "tablet",
    usage: "Bacterial infections", side: "GI upset", alt: [] },
  { id: 7, brand: "Cetirizine", generic: "Cetirizine Hydrochloride", strength: "10 mg", form: "tablet",
    usage: "Allergy and cold", side: "Drowsiness", alt: [5] },
  { id: 8, brand: "Pantocid", generic: "Pantoprazole", strength: "40 mg", form: "tablet",
    usage: "Acidity, reflux", side: "Headache, nausea", alt: [] },
  { id: 9, brand: "Shelcal", generic: "Calcium + Vitamin D3", strength: "500 mg", form: "tablet",
    usage: "Bone strength", side: "Constipation (rare)", alt: [] },
  { id: 10, brand: "Metformin", generic: "Metformin Hydrochloride", strength: "500 mg", form: "tablet",
    usage: "Type 2 Diabetes", side: "GI discomfort", alt: [] },
  // … (you can easily extend to 50+ later)
];

// ------------------------------------------------------
// 🏥 Pharmacy dataset (Bengaluru area simulation)
// ------------------------------------------------------
export const pharmacies = [
  { id: 1, name: "City Medico", lat: 12.9716, lon: 77.5946, address: "MG Road", open24: false, rating: 4.4, services: ["Delivery", "Card"] },
  { id: 2, name: "Green Cross", lat: 12.9352, lon: 77.6245, address: "HSR Layout", open24: true, rating: 4.6, services: ["Delivery"] },
  { id: 3, name: "CarePlus Pharmacy", lat: 12.9279, lon: 77.6271, address: "Koramangala", open24: false, rating: 4.1, services: [] },
  { id: 4, name: "HealthKart Meds", lat: 12.9833, lon: 77.6050, address: "Shivajinagar", open24: true, rating: 4.7, services: ["Delivery", "Card"] },
  { id: 5, name: "WellCare Hub", lat: 12.9580, lon: 77.6380, address: "Indiranagar", open24: false, rating: 4.3, services: ["Card"] },
  { id: 6, name: "Apollo Express", lat: 12.9900, lon: 77.7000, address: "Whitefield", open24: true, rating: 4.5, services: ["Delivery"] },
  { id: 7, name: "Rx Point", lat: 12.9000, lon: 77.5800, address: "BTM", open24: false, rating: 4.0, services: [] },
  { id: 8, name: "Night Owl Pharmacy", lat: 12.9550, lon: 77.5900, address: "Richmond Town", open24: true, rating: 4.2, services: ["Delivery"] },
  { id: 9, name: "Guardian Meds", lat: 12.9800, lon: 77.6200, address: "Ulsoor", open24: false, rating: 4.1, services: [] },
  { id: 10, name: "Medico 24x7", lat: 12.9750, lon: 77.6400, address: "CMH Road", open24: true, rating: 4.8, services: ["Delivery", "Card"] },
];

// ------------------------------------------------------
// 💰 Inventory: Pharmacy ID → Medicine ID → {price, stock}
// ------------------------------------------------------
export const inventory = {
  1: { 1:{price:35,stock:90}, 3:{price:180,stock:70} },
  2: { 1:{price:33,stock:50}, 4:{price:28,stock:60} },
  3: { 1:{price:34,stock:30}, 2:{price:95,stock:60} },
  4: { 1:{price:36,stock:85}, 5:{price:120,stock:50} },
  5: { 3:{price:176,stock:25}, 6:{price:210,stock:20} },
  6: { 1:{price:38,stock:40}, 2:{price:92,stock:40}, 5:{price:118,stock:45} },
  7: { 1:{price:32,stock:18} },
  8: { 4:{price:30,stock:55}, 1:{price:37,stock:65} },
  9: { 2:{price:88,stock:35}, 5:{price:125,stock:42} },
  10:{ 1:{price:31,stock:95}, 3:{price:178,stock:65} }
};
