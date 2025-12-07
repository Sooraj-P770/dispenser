/* ---------------------------
   Simple app state & patients
   --------------------------- */
const patients = {
    1: { name: "John", med: "Paracetamol", dose: "1 Tablet", schedule: "9 AM" },
    2: { name: "Riya", med: "Cough Syrup", dose: "10 ml", schedule: "1 PM" },
    3: { name: "Akash", med: "Antibiotic", dose: "1 Capsule", schedule: "6 PM" },
    4: { name: "Mary", med: "Vitamin D", dose: "1 Tablet", schedule: "8 PM" }
};

let currentBed = null;

/* ---------------------------
   Firebase initialization (compat SDK)
   --------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyCDOvjebFLwmNnUskeLopBqT7vX4p0zkQE",
    authDomain: "medicine-6f6b4.firebaseapp.com",
    projectId: "medicine-6f6b4",
    storageBucket: "medicine-6f6b4.firebasestorage.app",
    messagingSenderId: "965552398904",
    appId: "1:965552398904:web:746f3fb0ddc31a27d83ccd",
    measurementId: "G-53T2HKMV3L"
};

// Initialize Firebase (only once)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/* ---------------------------
   Screen helper
   --------------------------- */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------
   Login flow
   --------------------------- */
function revealLogin() {
    document.getElementById('loginForm').classList.toggle('hidden-block');
    setTimeout(()=> { document.getElementById('username').focus(); }, 200);
}

function attemptLogin() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (user === 'nurse' && pass === '1234') {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        showScreen('dashboardScreen');
        setRobotStatus('Idle');
    } else alert('Invalid username or password. Use nurse / 1234 to demo.');
}

/* ---------------------------
   Robot Status & Dashboard
   --------------------------- */
function setRobotStatus(text) {
    const el = document.getElementById('robotStatus');
    if (el) el.innerText = text;
}

function startDispenseFlow() {
    setRobotStatus('Preparing to dispense...');
    setTimeout(() => {
        setRobotStatus('Ready');
        showScreen('dispenseScreen');
    }, 700);
}

/* ---------------------------
   Bed -> Patient edit
   --------------------------- */
function openPatient(bed) {
    currentBed = bed;
    const p = patients[bed];
    if (!p) return alert('Patient not found');

    document.getElementById('pTitle').innerText = `Patient — Bed ${bed}`;
    document.getElementById('pName').value = p.name;
    document.getElementById('pMed').value = p.med;
    document.getElementById('pDose').value = p.dose;
    document.getElementById('pSchedule').value = p.schedule;

    showScreen('patientScreen');
}

function savePatient() {
    if (!currentBed) return alert('No bed selected');

    patients[currentBed].med = document.getElementById('pMed').value || patients[currentBed].med;
    patients[currentBed].dose = document.getElementById('pDose').value || patients[currentBed].dose;
    patients[currentBed].schedule = document.getElementById('pSchedule').value || patients[currentBed].schedule;

    setRobotStatus(`Dispatching to Bed ${currentBed}...`);
    
    // Send command to robot via Firestore
    db.collection("robotCommands").doc(`bed${currentBed}`).set({
        bed: currentBed,
        medicine: patients[currentBed].med,
        dose: patients[currentBed].dose,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: "dispatched"
    }).then(() => {
        console.log("Command sent to robot");
        showScreen('dashboardScreen');
        setRobotStatus('En route to patient...');
        waitForRobotArrival(currentBed);
    }).catch((error) => {
        console.error("Error sending command:", error);
        alert("Failed to send command to robot");
    });
}

/* ---------------------------
   Wait for robot arrival via Firestore
   --------------------------- */
function waitForRobotArrival(bed) {
    const docRef = db.collection("robotStatus").doc(`bed${bed}`);
    const unsubscribe = docRef.onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        console.log("Robot status update:", data);
        
        if (data.status === "arrived") {
            robotReachedPatient(bed);
            unsubscribe();
        }
    }, (error) => {
        console.error("Error listening to robot status:", error);
    });
}

/* ---------------------------
   Robot arrival & greeting
   --------------------------- */
function robotReachedPatient(bed) {
    const p = patients[bed];
    if (!p) return;

    document.getElementById('pgName').innerText = p.name;
    document.getElementById('pgMedView').innerText = p.med;
    document.getElementById('pgDoseView').innerText = p.dose;
    document.getElementById('pgScheduleView').innerText = p.schedule;

    setRobotStatus(`Arrived at Bed ${bed}`);
    showScreen('patientGreetingScreen');
}

/* ---------------------------
   Confirmation from patient
   --------------------------- */
function confirmMedicine(received) {
    if (received) {
        setRobotStatus('Dispense completed');
        document.getElementById('finalMsg').innerText = 'Medicine delivered and confirmed.';
        
        // Log confirmation to Firestore
        if (currentBed) {
            db.collection("deliveryLogs").add({
                bed: currentBed,
                patient: patients[currentBed].name,
                medicine: patients[currentBed].med,
                received: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } else {
        setRobotStatus('Issue reported - nurse notified');
        document.getElementById('finalMsg').innerText = 'The nurse has been notified. Please wait.';
        
        // Log issue to Firestore
        if (currentBed) {
            db.collection("deliveryLogs").add({
                bed: currentBed,
                patient: patients[currentBed].name,
                medicine: patients[currentBed].med,
                received: false,
                issue: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    showScreen('thankScreen');

    setTimeout(() => {
        showScreen('dashboardScreen');
        setRobotStatus('Idle');
    }, 1600);
}

/* ---------------------------
   Helper: go home
   --------------------------- */
function goHome() {
    showScreen('welcomeScreen');
    setRobotStatus('Idle');
}

/* ---------------------------
   Listen for general robot status updates
   --------------------------- */
function setupRobotStatusListener() {
    db.collection("robotStatus").doc("status1").onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.message) {
                document.getElementById("robotMsg").innerText = data.message;
            }
        }
    }, (error) => {
        console.error("Error listening to robot status:", error);
    });
}

/* ---------------------------
   Init
   --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    setRobotStatus('Idle');
    setupRobotStatusListener();
    console.log("Firebase initialized and listeners set up");
});
