import React, { useState, useEffect } from 'react';
import ProjectCard from './ProjectCard';
import MaintenanceCard from './MaintenanceCard'; // HÄMTAR NYA KOMPONENTEN!
import { Bell, Home, FileText, Plus, AlertTriangle } from 'lucide-react';
import { db } from './firebase'; // Hämtar din config!
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore'; // Hämtar Firestore-metoder!

function App() {
  // Kan vara "home", "log" eller "new"
  const [currentTab, setCurrentTab] = useState("home");
  const [selectedProject, setSelectedProject] = useState(null); // Håller det projekt som visas i modalen
  const [isModalActive, setIsModalActive] = useState(false);
  const [modalOrigin, setModalOrigin] = useState(null); // Sparar { top, left, width, height } för kortet du klickade på
  const [isEditing, setIsEditing] = useState(false); // Håller koll på om vi är i redigeringsläge
  const [editFields, setEditFields] = useState({ name: "", cost: "", date: "", category: "", description: "" }); // Håller temporär data under redigeringen

  // Håller koll på om underhållsmenyn i headern är öppen
  const [showMaintenanceDropdown, setShowMaintenanceDropdown] = useState(false);

  // --- STATES FÖR FORMULÄRET ---
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newCategory, setNewCategory] = useState("Renovering");
  const [newDate, setNewDate] = useState("");
  const [newRepeat, setNewRepeat] = useState("Varje år");
  const [isMaintenanceTask, setIsMaintenanceTask] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  // --- STATES FÖR FILTRERING OCH SÖK ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]); // Tom array betyder "Alla"
  const [selectedYear, setSelectedYear] = useState("Alla år");
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  
  // States för kostnadsslidern (både temporärt i menyn och aktivt filter)
  const [costRange, setCostRange] = useState([0, 100000]); // [min, max]
  const [activeCostFilter, setActiveCostFilter] = useState(null); // null betyder att filtret är inaktivt

  // --- HÄMTA PROJEKT FRÅN FIRESTORE I REALTID ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sortera efter datum så nyaste hamnar överst
      projectsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setProjects(projectsData);
    });

    return () => unsubscribe(); // Stänger lyssnaren när komponenten dör
  }, []);

  // --- HÄMTA UNDERHÅLL FRÅN FIRESTORE I REALTID ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "maintenance"), (snapshot) => {
      const maintenanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaintenanceTasks(maintenanceData);
    });

    return () => unsubscribe();
  }, []);

  // --- FUNKTION FÖR ATT SPARA PROJEKTET ---
  const handleAddProject = (e) => {
    e.preventDefault();

    if (!newName || !newDate) {
      alert("Vänligen fyll i både titel/namn och datum!");
      return;
    }

    if (isMaintenanceTask) {
      // --- SPARA UNDERHÅLL I FIRESTORE ---
      addDoc(collection(db, "maintenance"), {
        name: newName,
        deadline: newRepeat,
        isCompleted: false,
        description: newDescription
      });
      setCurrentTab("home");
    } else {
      // --- SPARA PROJEKT I FIRESTORE ---
      addDoc(collection(db, "projects"), {
        name: newName,
        date: newDate,
        cost: Number(newCost) || 0,
        category: newCategory,
        description: newDescription
      });
      setCurrentTab("log");
    }

    // Töm och nollställ allt
    setNewName("");
    setNewCost("");
    setNewCategory("Renovering");
    setNewDate("");
    setNewRepeat("Varje år");
    setIsMaintenanceTask(false);
    setNewDescription("");
  };
  
  // 1. Projektlistan (startar tom, hämtas från Firebase)
  const [projects, setProjects] = useState([]);

  // 2. Underhållsuppgifterna (startar tom, hämtas från Firebase)
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);

  // 3. NY FUNKTION: Den här körs när man klickar på checkboxen
  const toggleMaintenanceTask = async (id) => {
    const task = maintenanceTasks.find(t => t.id === id);
    if (task) {
      const taskRef = doc(db, "maintenance", id);
      await updateDoc(taskRef, {
        isCompleted: !task.isCompleted
      });
    }
  };

  // --- FUNKTION FÖR ATT UPPDATERA ETT BEFINTLIGT PROJEKT ---
  const handleUpdateProject = async () => {
    if (!editFields.name || !editFields.date) {
      alert("Titel och datum får inte vara tomma!");
      return;
    }

    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      await updateDoc(projectRef, {
        name: editFields.name,
        cost: Number(editFields.cost) || 0,
        date: editFields.date,
        category: editFields.category,
        description: editFields.description
      });
      
      // Stäng redigeringsläget och uppdatera modalens visningstext
      setIsEditing(false);
      setSelectedProject({ id: selectedProject.id, ...editFields, cost: Number(editFields.cost) || 0 });
    } catch (error) {
      console.error("Fel vid uppdatering:", error);
      alert("Kunde inte spara ändringarna.");
    }
  };

  // --- MATEMATIK & DYNAMISK TEXT (från tidigare) ---
  const totalProjects = projects.length;
  const totalInvestment = projects.reduce((sum, project) => sum + project.cost, 0);
  const spentThisYear = projects.filter(p => p.date.startsWith('2026')).reduce((sum, p) => sum + p.cost, 0);
  const projectsPerYear = {};
  projects.forEach(p => {
    if (p.date) {
      const year = p.date.split('-')[0];
      projectsPerYear[year] = (projectsPerYear[year] || 0) + 1;
    }
  });
  const yearStatsString = Object.entries(projectsPerYear).sort((a, b) => b[0] - a[0]).map(([y, c]) => `${y}: ${c}`).join('  |  ');

  // Separera aktiva och avklarade uppgifter så vi kan visa dem på rätt ställe
  const activeTasks = maintenanceTasks.filter(t => !t.isCompleted);

  // 1. Räkna ut dynamiskt maxvärde för kostnadsslidern baserat på dina projekt
  const maxProjectCost = projects.length > 0 ? Math.max(...projects.map(p => p.cost)) : 100000;

  // 2. Skapa en dynamisk lista av unika år som finns i din databas
  const availableYears = Array.from(
    new Set(projects.map(p => p.date ? p.date.split('-')[0] : null).filter(Boolean))
  ).sort((a, b) => b - a); // Sortera nyaste åren först

  // 3. SILEN: Här filtreras projekten baserat på alla aktiva val
  const filteredProjects = projects.filter(project => {
    // Sökfilter (matchar titel eller kategori)
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.category.toLowerCase().includes(searchQuery.toLowerCase());

    // Kategorifilter (multiselect)
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(project.category);

    // Årsfilter
    const projectYear = project.date ? project.date.split('-')[0] : "";
    const matchesYear = selectedYear === "Alla år" || projectYear === selectedYear;

    // Kostnadsfilter (Aktiveras bara om man tryckt på "Tillämpa")
    const matchesCost = !activeCostFilter || (project.cost >= activeCostFilter[0] && project.cost <= activeCostFilter[1]);

    return matchesSearch && matchesCategory && matchesYear && matchesCost;
  });

  // Ordlista för svenska kategoritexter
  const categoryLabels = {
    "Renovering": "Renovering",
    "Nybyggnation": "Nybyggnation",
    "Trädgård": "Trädgård",
    "Mindre fix": "Mindre fix",
    "Annat": "Annat"
  };

  // === HÄR SKJUTER DU IN DEN NYA KODEN ===
  if (currentTab === "new") {
    return (
      <div style={{ 
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#f9f9f9',
        zIndex: 9999,
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Det vita kortet blir nu en fullhöjdsbehållare */}
        <div style={{ backgroundColor: '#fff', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          
          {/* STICKY HEADER (Fast i toppen) */}
          <div style={{ padding: '20px 20px 10px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold' }}>Skapa aktivitet</h2>
          </div>
          
          <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
            
            {/* SCROLLBAR YTA FÖR INPUTS (Här inuti scrollar allt) */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

              {/* TOGGLE SWITCH HÖGST UPP */}
              <div 
                onClick={() => {
                  setIsMaintenanceTask(!isMaintenanceTask);
                  setNewName("");
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  backgroundColor: '#f3f4f6', 
                  padding: '14px', 
                  borderRadius: '10px', 
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>Underhållsärende</span>
                <div style={{
                  width: '44px',
                  height: '24px',
                  backgroundColor: isMaintenanceTask ? '#10b981' : '#d1d5db',
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: isMaintenanceTask ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* DYNAMISKA FÄLT BASERAT PÅ TOGGLEN */}
              {isMaintenanceTask ? (
                <>
                  {/* --- UNDERHÅLLSFORMULÄR --- */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Titel</label>
                    <input 
                      type="text" 
                      placeholder="t.ex. Rensa hängrännorna"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Datum</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', fontFamily: 'sans-serif' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Repetera</label>
                    <select 
                      value={newRepeat}
                      onChange={(e) => setNewRepeat(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', backgroundColor: '#fff' }}
                    >
                      <option value="Varje vecka">Varje vecka</option>
                      <option value="Varje månad">Varje månad</option>
                      <option value="Var 3e månad">Var 3e månad</option>
                      <option value="Var 6e månad">Var 6e månad</option>
                      <option value="Varje år">Varje år</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* --- VANLIGT PROJEKTFORMULÄR --- */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Aktivitetsnamn</label>
                    <input 
                      type="text" 
                      placeholder="t.ex. Målat om hallen"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Kostnad (SEK)</label>
                    <input 
                      type="number" 
                      placeholder="t.ex. 2500"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Datum</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', fontFamily: 'sans-serif' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Kategori</label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', backgroundColor: '#fff' }}
                    >
                      <option value="Renovering">Renovering</option>
                      <option value="Nybyggnation">Nybyggnation</option>
                      <option value="Trädgård">Trädgård</option>
                      <option value="Mindre fix">Mindre fix</option>
                      <option value="Annat">Annat</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- BESKRIVNING (OPTIONAL) --- */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', textItem: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Beskrivning</label>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Valfritt</span>
                </div>
                <textarea 
                  placeholder="t.ex. Använde färgkod S 0502-Y, köpte 5 liter på Bauhaus."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #d1d5db', 
                    fontSize: '16px', 
                    fontFamily: 'sans-serif',
                    resize: 'none'
                  }}
                />
              </div> {/* Denna stänger beskrivnings-diven */}

            </div> {/* Denna stänger den scrollbara ytan för inputs */}

            {/* STICKY BOTTIENPLATTA – Denna ligger nu utanför scrollen */}
            <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', marginTop: 'auto' }}>
              <button 
                type="button"
                onClick={() => {
                  setNewName("");
                  setNewCost("");
                  setNewCategory("Renovering");
                  setNewDate("");
                  setNewRepeat("Varje år");
                  setIsMaintenanceTask(false);
                  setCurrentTab("home");
                }}
                style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Avbryt
              </button>

              <button 
                type="submit"
                style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}
              >
                Spara
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0px 0px 90px 0px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh', maxWidth: '400px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* HEADER (Visas alltid högst upp på alla skärmar) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#ffffff', // <-- HÄR väljer du din bakgrundsfärg!
        padding: '16px 20px',       // Lägger till luft inuti headern (upp/ner, vänster/höger)
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', // En subtil skugga under headern
        margin: '0', // Sträcker ut headern hela vägen till appens ytterkanter
        borderBottom: '1px solid #E5E7EB'
      }}>
        <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>Husloggen</h1>
        <div 
          onClick={() => setShowMaintenanceDropdown(!showMaintenanceDropdown)} // <-- Växlar dropdownen!
          style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4b5563' }}
        >
          <Bell size={22} /> 
          {activeTasks.length > 0 && (
            <span style={{ backgroundColor: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', position: 'absolute', top: '-5px', right: '-5px', fontWeight: 'bold' }}>
              {activeTasks.length}
            </span>
          )}

          {/* --- DROPDOWN-MENY ENLIGT SKÄRMDUMPEN --- */}
          {showMaintenanceDropdown && (
            <div 
              onClick={(e) => e.stopPropagation()} // Hindrar menyn från att stängas om man råkar klicka inuti den
              style={{
                position: 'absolute',
                top: '35px',
                right: '0',
                width: '280px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                zIndex: 2000,
                cursor: 'default',
                fontFamily: 'sans-serif'
              }}
            >
              {/* Header i menyn */}
              <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>Underhållsuppgifter</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                  {activeTasks.length} kvar att göra
                </div>
              </div>

              {/* Lista med aktiva uppgifter */}
              <div style={{ padding: '8px 16px', maxHeight: '200px', overflowY: 'auto' }}>
                {activeTasks.length > 0 ? (
                  activeTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
                      <div 
                        onClick={() => toggleMaintenanceTask(task.id)}
                        style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #9ca3af', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{task.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Deadline: {task.deadline}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: '#10b981', padding: '10px 0', fontWeight: '500' }}>🎉 Allt underhåll är klart!</div>
                )}
              </div>

              {/* Sektion för avklarade uppgifter */}
              <div style={{ backgroundColor: '#f9fafb', padding: '8px 16px', fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Avklarade
              </div>

              <div style={{ padding: '8px 16px', maxHeight: '150px', overflowY: 'auto', borderRadius: '0 0 16px 16px' }}>
                {maintenanceTasks.filter(t => t.isCompleted).length > 0 ? (
                  maintenanceTasks.filter(t => t.isCompleted).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', opacity: 0.5 }}>
                      <div 
                        onClick={() => toggleMaintenanceTask(task.id)}
                        style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #10b981', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', cursor: 'pointer' }}
                      >
                        ✓
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', textDecoration: 'line-through' }}>{task.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Deadline: {task.deadline}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: '#9ca3af', padding: '10px 0', fontStyle: 'italic' }}>Inga avklarade uppgifter ännu</div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* NY BEHÅLLARE FÖR ALLT INNEHÅLL */}
      <div style={{ padding: '20px' }}>

        {/* --- SKÄRM 1: HOME (DASHBOARD) --- */}
        {currentTab === "home" && (
          <>
            {/* METRICS (Flyttade hit in!) */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Antal Projekt</span>
              <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>{totalProjects}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>{yearStatsString}</div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flex: 1, border: '1px solid #E5E7EB' }}>
                <span style={{ color: '#666', fontSize: '12px' }}>Total Investering</span>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}>{totalInvestment.toLocaleString()} kr</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flex: 1, border: '1px solid #E5E7EB' }}>
                <span style={{ color: '#666', fontSize: '12px' }}>Spenderat i år</span>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}>{spentThisYear.toLocaleString()} kr</div>
              </div>
            </div>

            {/* UPCOMING MAINTENANCE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: '#666' }}>
              <AlertTriangle size={14} style={{ color: '#d97706' }} />
              <p style={{ color: '#666', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>Kommande underhåll</p>
            </div>
            <div style={{ marginBottom: '30px' }}>
              {activeTasks.length > 0 ? (
                activeTasks.map(task => (
                  <MaintenanceCard 
                    key={task.id}
                    name={task.name}
                    deadline={task.deadline}
                    icon={task.icon}
                    isCompleted={task.isCompleted}
                    onToggle={() => toggleMaintenanceTask(task.id)}
                  />
                ))
              ) : (
                <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '500' }}>🎉 Allt underhåll är klart!</p>
              )}
            </div>
          </>
        )}

        {/* --- SKÄRM 2: LOG (HISTORIK MED AVANCERAT FILTER) --- */}
        {currentTab === "log" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif' }}>
            
            {/* SÖKFÄLT */}
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="Sök bland projekt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: '14px', top: '13px', color: '#9ca3af' }}>🔍</span>
            </div>

            {/* HORISONTELL SCROLLBAR RAD FÖR BADGES */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              overflowX: 'auto', 
              paddingBottom: '4px',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch'
            }}>
              {/* BADGE: ALLA KATEGORIER */}
              <button
                onClick={() => setSelectedCategories([])} // Tömmer arrayen = visar alla
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: selectedCategories.length === 0 ? '#2563eb' : '#f3f4f6',
                  color: selectedCategories.length === 0 ? '#fff' : '#4b5563',
                }}
              >
                Alla
              </button>

              {/* DYNAMISKA KATEGORIBADGES (MULTISELECT) */}
              {Object.entries(categoryLabels).map(([key, label]) => {
                const isSelected = selectedCategories.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter(c => c !== key));
                      } else {
                        setSelectedCategories([...selectedCategories, key]);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#2563eb' : '#f3f4f6',
                      color: isSelected ? '#fff' : '#4b5563',
                    }}
                  >
                    {label}
                  </button>
                );
              })}

              {/* DROPDOWN-BADGE: DATUM (ÅR) */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={() => {
                    setShowYearDropdown(!showYearDropdown);
                    setShowCostModal(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: selectedYear !== "Alla år" ? '#eff6ff' : '#fff',
                    color: selectedYear !== "Alla år" ? '#2563eb' : '#4b5563',
                    borderColor: selectedYear !== "Alla år" ? '#bfdbfe' : '#e5e7eb',
                  }}
                >
                  {selectedYear} ▾
                </button>
              </div>

              {/* MODAL-BADGE: KOSTNAD */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={() => {
                    setShowCostModal(!showCostModal);
                    setShowYearDropdown(false);
                    // Initiera slider-värdet till nuvarande max om det inte redan är satt
                    if (!activeCostFilter) setCostRange([0, maxProjectCost]);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: activeCostFilter ? '#eff6ff' : '#fff',
                    color: activeCostFilter ? '#2563eb' : '#4b5563',
                    borderColor: activeCostFilter ? '#bfdbfe' : '#e5e7eb',
                  }}
                >
                  {activeCostFilter ? `Kostnad: Aktiv` : 'Kostnad ▾'}
                </button>
              </div>
            </div>

            {/* FLYTANDE CONTAINER UTANFÖR TUNNELN MED SKYHÖGT Z-INDEX */}
            <div style={{ position: 'relative', zIndex: 99999 }}>
              
              {/* ÅRSDROPDOWN-MENY */}
              {showYearDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '120px', // Ligger nu precis under Datum-knappen på skärmen
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb',
                  zIndex: 99999,
                  minWidth: '120px',
                  overflow: 'hidden'
                }}>
                  <div 
                    onClick={() => { setSelectedYear("Alla år"); setShowYearDropdown(false); }}
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', backgroundColor: selectedYear === "Alla år" ? '#f3f4f6' : '#fff' }}
                  >
                    Alla år
                  </div>
                  {availableYears.map(year => (
                    <div 
                      key={year}
                      onClick={() => { setSelectedYear(year); setShowYearDropdown(false); }}
                      style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', backgroundColor: selectedYear === year ? '#f3f4f6' : '#fff' }}
                    >
                      {year}
                    </div>
                  ))}
                </div>
              )}

              {/* SLIDER EXPANDERA-KORT (KOSTNAD) */}
              {showCostModal && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '0px',
                  width: '280px',
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  border: '1px solid #e5e7eb',
                  padding: '16px',
                  zIndex: 99999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxSizing: 'border-box'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Kostnadsintervall</span>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                    <span>{costRange[0].toLocaleString()} kr</span>
                    <span>{costRange[1].toLocaleString()} kr</span>
                  </div>

                  <input 
                    type="range"
                    min="0"
                    max={maxProjectCost}
                    value={costRange[1]}
                    onChange={(e) => setCostRange([costRange[0], Number(e.target.value)])}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                    <span>0 kr</span>
                    <span>Max: {maxProjectCost.toLocaleString()} kr</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        setActiveCostFilter(null);
                        setCostRange([0, maxProjectCost]);
                        setShowCostModal(false);
                      }}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#4b5563' }}
                    >
                      Nollställ
                    </button>
                    <button
                      onClick={() => {
                        setActiveCostFilter([costRange[0], costRange[1]]);
                        setShowCostModal(false);
                      }}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
                    >
                      Tillämpa
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* HISTORIKLISTA (Hämtar nu data från SILEN `filteredProjects`) */}
            <p style={{ color: '#666', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', marginTop: '8px', marginBottom: '4px' }}>
              Projekt ({filteredProjects.length})
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
              {filteredProjects.length > 0 ? (
                filteredProjects.map(project => (
                  <div 
                    key={project.id} 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setModalOrigin({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
                      
                      // Ladda in projektets nuvarande värden i redigeringsfälten
                      setEditFields({
                        name: project.name,
                        cost: project.cost,
                        date: project.date,
                        category: project.category,
                        description: project.description || ""
                      });
                      setIsEditing(false); // Säkerställ att vi startar i visningsläge
                      
                      setSelectedProject(project);
                      setTimeout(() => setIsModalActive(true), 20);
                    }} 
                    style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
                  >
                    <ProjectCard 
                      name={project.name} 
                      date={project.date} 
                      cost={project.cost} 
                      category={project.category} 
                    />
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '24px' }}>🔍</span>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Inga projekt matchar dina filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div> {/* Stänger <div style={{ padding: '20px' }}> (innehållsbehållaren) */}

      {/* --- BOTTENMENY (TAB BAR) --- */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '400px', height: '60px', padding: '0 30px', backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-around', alignItems: 'center', boxSizing: 'border-box', zIndex: 1000 }}>
        <button onClick={() => setCurrentTab("home")} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: currentTab === "home" ? '#2563eb' : '#9ca3af' }}>
          <Home size={20} />
          <span style={{ fontSize: '11px', fontWeight: '500' }}>Hem</span>
        </button>
        <button onClick={() => setCurrentTab("new")} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', width: '56px', height: '56px', borderRadius: '50%', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)', transform: 'translateY(-15px)', transition: 'all 0.2s' }}>
          <Plus size={28} />
        </button>
        <button onClick={() => setCurrentTab("log")} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: currentTab === "log" ? '#2563eb' : '#9ca3af' }}>
          <FileText size={20} />
          <span style={{ fontSize: '11px', fontWeight: '500' }}>Logg</span>
        </button>
      </div>

      {/* --- AVANCERAD DELA-ELEMENT-MODAL --- */}
      {selectedProject && modalOrigin && (
        <div 
          onClick={() => {
            setIsModalActive(false);
            setTimeout(() => {
              setSelectedProject(null);
              setModalOrigin(null);
            }, 250); // Vänta tills den krympt tillbaka till sin startposition
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isModalActive ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0)',
            zIndex: 10000,
            transition: 'background-color 0.25s ease-out',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              position: 'fixed',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              
              // --- DYNAMISK POSITIONERING BASERAT PÅ KLICK ---
              top: isModalActive ? 'calc(50% - 200px)' : `${modalOrigin.top}px`,
              left: isModalActive ? 'calc(50% - 180px)' : `${modalOrigin.left}px`,
              width: isModalActive ? '360px' : `${modalOrigin.width}px`,
              height: isModalActive ? 'auto' : `${modalOrigin.height}px`,
              minHeight: isModalActive ? '260px' : `${modalOrigin.height}px`,
              
              // --- ANIMATION ---
              opacity: isModalActive ? 1 : 0.8,
              padding: isModalActive ? '20px' : '12px', // Krymper paddingen i minimerat läge för att matcha kortet
              boxShadow: isModalActive ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 2px 4px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.15)', // Ger ett skönt sug i expansionen
            }}
          >
            {/* STÄNGNINGSKRYSS (Döljs under animationen så det inte fladdrar) */}
            <button 
              onClick={() => {
                setIsModalActive(false);
                setTimeout(() => {
                  setSelectedProject(null);
                  setModalOrigin(null);
                }, 250);
              }}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: '5px',
                opacity: isModalActive ? 1 : 0,
                transition: 'opacity 0.1s'
              }}
            >
              ✕
            </button>

            {/* MODALENS INNEHÅLL (Inramat i en fade-in-effekt) */}
            <div style={{ opacity: isModalActive ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
              {isEditing ? (
                /* --- HÄR VISAS INPUTS OM VI REDIGERAR --- */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }}>Kategori</label>
                    <select 
                      value={editFields.category}
                      onChange={(e) => setEditFields({ ...editFields, category: e.target.value })}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#fff' }}
                    >
                      <option value="Renovering">Renovering</option>
                      <option value="Nybyggnation">Nybyggnation</option>
                      <option value="Trädgård">Trädgård</option>
                      <option value="Mindre fix">Mindre fix</option>
                      <option value="Annat">Annat</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }}>Namn</label>
                    <input 
                      type="text"
                      value={editFields.name}
                      onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }}>Datum</label>
                      <input 
                        type="date"
                        value={editFields.date}
                        onChange={(e) => setEditFields({ ...editFields, date: e.target.value })}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontFamily: 'sans-serif' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }}>Kostnad (kr)</label>
                      <input 
                        type="number"
                        value={editFields.cost}
                        onChange={(e) => setEditFields({ ...editFields, cost: e.target.value })}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280' }}>Beskrivning</label>
                    <textarea 
                      value={editFields.description}
                      onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                      rows={3}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontFamily: 'sans-serif', resize: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                /* --- HÄR VISAS DEN VANLIGA TEXTEN SOM VANLIGT --- */
                <>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.5px' }}>
                      {selectedProject.category || 'Projekt'}
                    </span>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#1f2937', paddingRight: '20px' }}>
                      {selectedProject.name}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>Datum</span>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{selectedProject.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>Kostnad</span>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                        {(selectedProject.cost || 0).toLocaleString()} kr
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, minHeight: 0 }}>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Beskrivning</span>
                    <p style={{ 
                      fontSize: '14px', 
                      color: selectedProject.description ? '#4b5563' : '#9ca3af', 
                      margin: '4px 0 0 0', 
                      lineHeight: '1.5',
                      fontStyle: selectedProject.description ? 'normal' : 'italic',
                      backgroundColor: '#f9fafb',
                      padding: '10px',
                      borderRadius: '8px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedProject.description || 'Ingen beskrivning angiven för detta projekt.'}
                    </p>
                  </div>
                </>
              )}

              {/* --- VERKTYGSKNAPPAR I FOOTERN --- */}
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f3f4f6' }}>
                {isEditing ? (
                  <>
                    <button 
                      onClick={() => setIsEditing(false)}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Avbryt
                    </button>
                    <button 
                      onClick={handleUpdateProject}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Spara
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setIsModalActive(false);
                        setTimeout(() => { setSelectedProject(null); setModalOrigin(null); }, 250);
                      }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Stäng
                    </button>
                    <button 
                      onClick={() => setIsEditing(true)}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Redigera
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;