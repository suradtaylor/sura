import React, { useState, useEffect } from 'react';
import { 
  Trophy, Activity, Calendar, Utensils, Timer, ChevronRight, 
  CheckCircle, BarChart2, AlertCircle, Plane, Droplet, Flame, 
  ArrowRight, PlusCircle, Save, X, History, Cloud 
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

// --- FIREBASE CONFIGURATION (ACTION REQUIRED) ---
// Go to Firebase Console -> Project Settings -> General -> Your Apps -> SDK Setup and Config
// Copy the 'firebaseConfig' object and paste it here:
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCsngDtFuT-WVuiLFhaSDb0OEDou_F4p9c",
  authDomain: "gold-medalist-lagos.firebaseapp.com",
  projectId: "gold-medalist-lagos",
  storageBucket: "gold-medalist-lagos.firebasestorage.app",
  messagingSenderId: "773485127892",
  appId: "1:773485127892:web:379e0b032df4e1f87ab341",
  measurementId: "G-Z84XT954HT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- INITIAL DATA SEED ---
const INITIAL_ATHLETES = [
  {
    id: 'u14m',
    name: 'U14 Male',
    ageGroup: 'U14',
    gender: 'Male',
    events: ['50m Free', '50m Breast'],
    targets: { '50m Free': 26.00, '50m Breast': 32.50 }, 
    currentBests: { '50m Free': 29.50, '50m Breast': 36.00 },
    biometrics: { height: 165, wingspan: 168, weight: 52, rhr: 60, sleepAvg: 8.0 },
    logs: [] 
  },
  {
    id: 'u15f',
    name: 'U15 Female',
    ageGroup: 'U15',
    gender: 'Female',
    events: ['50m Free', '50m Breast'],
    targets: { '50m Free': 27.80, '50m Breast': 35.00 },
    currentBests: { '50m Free': 29.80, '50m Breast': 38.00 },
    biometrics: { height: 168, wingspan: 170, weight: 56, rhr: 62, sleepAvg: 8.5 },
    logs: [] 
  }
];

const SCHEDULE_PHASE_1 = {
  Monday: {
    focus: "Aerobic Capacity & Catch",
    am: ["400m Warmup Mix", "8x50m Drill (Fingertip Drag)", "4x400m Free @ Mod Pace", "200m Easy Back"],
    pm: ["300m Warmup", "12x25m Sprints (No Breath last 5)", "200m Easy"],
    dryland: null
  },
  Tuesday: {
    focus: "Threshold & Core",
    am: ["400m Mix", "16x100m Free (The Burner - 15s Rest)", "200m Double-Arm Back"],
    pm: null,
    dryland: ["3x1min Plank", "3x30 Russian Twists", "3x15 Squat Jumps"]
  },
  Wednesday: {
    focus: "IM & Technical Turns",
    am: ["400m IM Order", "4 Rounds: [4x50m Broken IM]", "10x Mid-Pool Turns"],
    pm: ["Starts & Breakouts Focus"],
    dryland: null
  },
  Thursday: {
    focus: "Speed & Power",
    am: ["400m Easy", "10x50m Fly/Main Stroke @ Fast", "10x50m Kick w/ Board"],
    pm: null,
    dryland: ["3xMax Pushups", "Pullups", "Streamline Stretches"]
  },
  Friday: {
    focus: "The London Test (Time Trial)",
    am: null,
    pm: ["RACE SIMULATION", "Warmup Routine", "50m Free (All Out)", "100m Stroke (All Out)"],
    dryland: null
  },
  Saturday: {
    focus: "The Monster Set (Endurance)",
    am: ["1000m Warmup", "5x400m Pull (Buoy only)", "10x100m Kick", "Hydrate!"],
    pm: null,
    dryland: null
  },
  Sunday: {
    focus: "Active Recovery",
    am: null,
    pm: null,
    dryland: ["20min Yoga/Stretch", "Church/Mosque", "Big Lunch"]
  }
};

const NUTRITION_PLAN = {
  general: {
    recovery: "Power Shake: 4 tbsp Peak/Dano Powder + 2 tbsp Milo + 500ml Water.",
    hydration: "Target: 3 Liters/Day (Lagos Heat).",
    notes: "No Gala. No Soda (except Sunday)."
  },
  meals: {
    Breakfast: "Boiled Yam + Egg Sauce + Spinach OR Oats w/ Powdered Milk",
    Lunch: "Rice & Chicken (Skinless) + Apple. Limit Oil.",
    PreSwim: "Banana + Groundnuts OR 2 Slices Bread + Jam",
    Dinner: "Moi-Moi + Fish Stew OR Pasta w/ Minced Meat (Light)"
  }
};

// --- COMPONENTS ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 ${className}`}>
    {children}
  </div>
);

const ProgressBar = ({ current, target, label, logs }) => {
  const percentage = Math.min(100, Math.max(0, (target / current) * 100));
  const isGoldPace = percentage >= 100;
  
  const recentLog = logs 
    ? logs.filter(l => l.event === label).sort((a,b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className={`font-mono ${isGoldPace ? 'text-yellow-600 font-bold' : 'text-slate-500'}`}>
          {current.toFixed(2)}s / <span className="text-xs text-slate-400">Target: {target}s</span>
        </span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-1">
        <div 
          className={`h-full transition-all duration-1000 ${isGoldPace ? 'bg-yellow-500' : 'bg-blue-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs">
         <span className="text-slate-400">
           {recentLog ? `Last: ${recentLog.time}s (${recentLog.date})` : 'No recent logs'}
         </span>
         <span className="text-slate-400">
           {isGoldPace ? "🥇 GOLD PACE" : `${(current - target).toFixed(2)}s to go`}
         </span>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState('u14m');
  
  // Timers
  const [recoveryTimer, setRecoveryTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [londonCountdown, setLondonCountdown] = useState(0);

  // 1. AUTHENTICATION & INITIALIZATION
  useEffect(() => {
    // Sign in anonymously so we can read/write to database
    signInAnonymously(auth).catch((error) => {
      console.error("Auth Error:", error);
    });
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. DATA SYNC (FIRESTORE)
  useEffect(() => {
    if (!user) return;

    // We store data in a collection called 'athletes'
    const athletesRef = collection(db, 'athletes');
    
    const unsubscribeData = onSnapshot(athletesRef, (snapshot) => {
      if (snapshot.empty) {
        // First run: Seed the database with INITIAL_ATHLETES
        INITIAL_ATHLETES.forEach(async (athlete) => {
           await setDoc(doc(athletesRef, athlete.id), athlete);
        });
      } else {
        const loadedAthletes = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setAthletes(loadedAthletes);
        setLoading(false);
      }
    }, (error) => {
      console.error("Data sync error:", error);
      // If error (likely permissions or config), stop loading to show UI
      setLoading(false); 
    });

    return () => unsubscribeData();
  }, [user]);


  // Timer Logic
  useEffect(() => {
    const raceDate = new Date('2026-05-08T00:00:00');
    setLondonCountdown(Math.ceil(Math.abs(raceDate - new Date()) / (1000 * 60 * 60 * 24)));

    let interval;
    if (recoveryTimer !== null && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) setRecoveryTimer('done');
    return () => clearInterval(interval);
  }, [recoveryTimer, timeLeft]);

  const startRecovery = () => {
    setRecoveryTimer('active');
    setTimeLeft(20 * 60);
  };

  const getDayOfWeek = () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const todaySchedule = SCHEDULE_PHASE_1[getDayOfWeek()] || SCHEDULE_PHASE_1['Monday'];
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId) || INITIAL_ATHLETES[0];

  const handleSaveLog = async (logData) => {
    if (!user) return;

    const athleteRef = doc(db, 'athletes', logData.athleteId);
    
    // Prepare updates
    let updates = {
      logs: arrayUnion({ ...logData, date: new Date().toLocaleDateString() })
    };

    // Check if we need to update biometrics or personal bests
    const athlete = athletes.find(a => a.id === logData.athleteId);
    
    if (athlete) {
      // 1. Update Personal Best?
      if (logData.event && logData.time) {
        const currentTime = parseFloat(logData.time);
        const currentBest = athlete.currentBests[logData.event] || 999;
        if (currentTime < currentBest) {
          updates[`currentBests.${logData.event}`] = currentTime;
        }
      }

      // 2. Update Biometrics?
      if (logData.weight) updates['biometrics.weight'] = logData.weight;
      if (logData.rhr) updates['biometrics.rhr'] = logData.rhr;
      if (logData.sleep) {
         // Simple average calc for demo
         const newAvg = (athlete.biometrics.sleepAvg + parseFloat(logData.sleep)) / 2;
         updates['biometrics.sleepAvg'] = newAvg;
      }
    }

    try {
      await updateDoc(athleteRef, updates);
      setShowLogModal(false);
    } catch (e) {
      console.error("Error saving log:", e);
      alert("Error saving data. Check console for details.");
    }
  };

  // --- MODAL ---
  const LogDataModal = () => {
    const [formData, setFormData] = useState({
      athleteId: selectedAthleteId,
      weight: '', sleep: '', rhr: '', hydration: '',
      event: selectedAthlete.events[0], time: '', strokeCount: '', rpe: 5
    });

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl h-[90vh] sm:h-auto flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800">Coach Input Screen</h3>
            <button onClick={() => setShowLogModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Athlete</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {athletes.map(a => (
                  <button key={a.id} onClick={() => setFormData({...formData, athleteId: a.id})}
                    className={`flex-1 py-2 text-sm font-medium rounded ${formData.athleteId === a.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h4 className="font-bold text-sm text-slate-800 mb-3">Daily Vitals</h4>
               <div className="grid grid-cols-2 gap-4">
                 <input type="number" className="p-2 border rounded" placeholder="Sleep (hrs)" value={formData.sleep} onChange={e => setFormData({...formData, sleep: e.target.value})} />
                 <input type="number" className="p-2 border rounded" placeholder="Weight (kg)" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                 <input type="number" className="p-2 border rounded" placeholder="RHR (bpm)" value={formData.rhr} onChange={e => setFormData({...formData, rhr: e.target.value})} />
                 <input type="number" className="p-2 border rounded" placeholder="Hydration (L)" value={formData.hydration} onChange={e => setFormData({...formData, hydration: e.target.value})} />
               </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
               <h4 className="font-bold text-sm text-blue-900 mb-3">Training Data</h4>
               <select className="w-full mb-3 p-2 border rounded" value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})}>
                 {athletes.find(a => a.id === formData.athleteId)?.events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
               </select>
               <div className="grid grid-cols-2 gap-4 mb-3">
                 <input type="number" className="p-2 border rounded" placeholder="Time (s)" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                 <input type="number" className="p-2 border rounded" placeholder="Strokes" value={formData.strokeCount} onChange={e => setFormData({...formData, strokeCount: e.target.value})} />
               </div>
               <label className="text-xs text-blue-700 block mb-1">Effort (RPE): {formData.rpe}/10</label>
               <input type="range" min="1" max="10" className="w-full" value={formData.rpe} onChange={e => setFormData({...formData, rpe: e.target.value})} />
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button onClick={() => handleSaveLog(formData)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center">
              <Save className="w-5 h-5 mr-2" /> Save to Cloud
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- LOADING SCREEN ---
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-slate-500 font-medium">Syncing with London Gold Database...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {showLogModal && <LogDataModal />}
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden relative">
        <div className="p-6 overflow-y-auto h-full pb-24">
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10"><Plane size={150} /></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-2 mb-2 text-yellow-500"><Trophy size={20} /><span className="font-bold text-xs uppercase">Road to London</span></div>
                  <h1 className="text-4xl font-black">{londonCountdown} Days</h1>
                  <p className="text-slate-400 text-sm flex items-center"><Cloud className="w-3 h-3 mr-1 text-green-400" /> Cloud Sync Active</p>
                </div>
              </div>
              
              <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                {athletes.map(a => (
                  <button key={a.id} onClick={() => setSelectedAthleteId(a.id)} 
                    className={`flex-1 py-2 text-sm font-medium rounded-md ${selectedAthleteId === a.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                    {a.name}
                  </button>
                ))}
              </div>

              <button onClick={() => setShowLogModal(true)} className="w-full py-4 bg-white border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-bold flex items-center justify-center hover:bg-blue-50">
                <PlusCircle className="w-5 h-5 mr-2" /> Log Today's Stats
              </button>

              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-slate-800 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-600" />{getDayOfWeek()}'s Plan</h2>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">Phase 1</span>
                </div>
                <p className="text-lg font-medium text-slate-900 mb-4">{todaySchedule.focus}</p>
                {todaySchedule.am && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 mb-2">AM SESSION</p>
                    <ul className="space-y-2">{todaySchedule.am.map((item, idx) => <li key={idx} className="flex items-start text-sm text-slate-700"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />{item}</li>)}</ul>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TRAIN */}
          {activeTab === 'train' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold text-slate-900">Training Hub</h2>
              <Card>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Activity className="w-5 h-5 mr-2 text-red-500" />Technique Focus</h3>
                <div className="space-y-3">
                   <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center"><div><p className="font-semibold text-sm">Fingertip Drag</p><p className="text-xs text-slate-500">High Elbows</p></div><ChevronRight className="w-4 h-4" /></div>
                   <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center"><div><p className="font-semibold text-sm">Streamline Jumps</p><p className="text-xs text-slate-500">Tight Core</p></div><ChevronRight className="w-4 h-4" /></div>
                </div>
              </Card>
              <button onClick={() => setShowLogModal(true)} className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-sm">Log Completed Workout</button>
            </div>
          )}

          {/* FUEL */}
          {activeTab === 'fuel' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-900">Nigerian Fuel</h2><div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">Lagos Mode</div></div>
              <Card className={`${recoveryTimer === 'active' ? 'border-green-500 ring-2 ring-green-100' : ''}`}>
                <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-800">Recovery Window</h3>{recoveryTimer === 'active' && <span className="text-2xl font-mono font-bold text-green-600 animate-pulse">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>}</div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-3"><p className="text-xs font-bold text-orange-800 uppercase mb-1">Power Shake</p><p className="text-sm text-orange-900">4 tbsp Peak/Dano + 2 tbsp Milo + Water</p></div>
                {recoveryTimer !== 'active' && <button onClick={startRecovery} className="w-full py-2 bg-slate-900 text-white rounded text-sm font-medium">Start Timer</button>}
              </Card>
              <div className="space-y-4">{Object.entries(NUTRITION_PLAN.meals).map(([meal, food]) => <div key={meal} className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase mb-1">{meal}</p><p className="text-slate-800 font-medium">{food}</p></div>)}</div>
            </div>
          )}

          {/* TRACK */}
          {activeTab === 'track' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-900">Performance Lab</h2><button onClick={() => setShowLogModal(true)} className="bg-blue-600 text-white p-2 rounded-full shadow-lg"><PlusCircle className="w-5 h-5" /></button></div>
              <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                {athletes.map(a => (
                  <button key={a.id} onClick={() => setSelectedAthleteId(a.id)} className={`flex-1 py-2 text-sm font-medium rounded-md ${selectedAthleteId === a.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>{a.name}</button>
                ))}
              </div>
              <Card>
                <h3 className="font-bold text-slate-800 mb-6 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-blue-600" />Gold Medal Probability</h3>
                {selectedAthlete.events.map(event => <ProgressBar key={event} label={event} current={selectedAthlete.currentBests[event]} target={selectedAthlete.targets[event]} logs={selectedAthlete.logs || []} />)}
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card><p className="text-xs text-slate-500 font-bold uppercase mb-1">Wingspan</p><p className="text-xl font-bold text-slate-900">{selectedAthlete.biometrics.wingspan}cm</p></Card>
                <Card><p className="text-xs text-slate-500 font-bold uppercase mb-1">RHR</p><p className="text-xl font-bold text-slate-900">{selectedAthlete.biometrics.rhr} bpm</p></Card>
              </div>
              {selectedAthlete.logs && selectedAthlete.logs.length > 0 && (
                <Card><h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center"><History className="w-4 h-4 mr-2" /> Recent Logs</h3><div className="space-y-2 max-h-40 overflow-y-auto">{selectedAthlete.logs.slice(-5).reverse().map((log, i) => <div key={i} className="text-xs border-l-2 border-slate-200 pl-3 py-1"><span className="font-bold text-slate-700">{log.date}:</span> {log.event} in {log.time}s</div>)}</div></Card>
              )}
            </div>
          )}

          {/* RACE */}
          {activeTab === 'race' && (
             <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold text-slate-900">Race Mode</h2>
              <Card>
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Timer className="w-5 h-5 mr-2 text-blue-600" />Split Calculator (50m)</h3>
                 <div className="grid grid-cols-2 gap-4 bg-slate-900 text-white p-4 rounded-lg text-center">
                    <div><p className="text-xs text-slate-400">Lap 1</p><p className="text-2xl font-bold text-yellow-500">12.75s</p></div>
                    <div><p className="text-xs text-slate-400">Lap 2</p><p className="text-2xl font-bold text-blue-400">14.25s</p></div>
                 </div>
                 <p className="text-xs text-slate-400 mt-2 text-center">Based on 27.0s Target</p>
              </Card>
            </div>
          )}

        </div>

        {/* BOTTOM NAV */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center z-40">
          {[
            { id: 'dashboard', icon: Trophy, label: 'Home' },
            { id: 'train', icon: Activity, label: 'Train' },
            { id: 'fuel', icon: Utensils, label: 'Fuel' },
            { id: 'track', icon: BarChart2, label: 'Track' },
            { id: 'race', icon: Flame, label: 'Race' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center space-y-1 ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400'}`}>
              <tab.icon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}