// ------------------------
// SCREEN NAVIGATION
// ------------------------
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

// ------------------------
// LOGIN LOGIC
// ------------------------
function revealLogin() {
    document.getElementById("loginForm").classList.remove("hidden-block");
}

function attemptLogin() {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();

    if (user === "nurse" && pass === "1234") {
        alert("Login successful");
        showScreen("dashboardScreen");
    } else {
        alert("Invalid login");
    }
}

// ------------------------
// GLOBAL VARIABLES
// ------------------------
let currentBed = null;

// ------------------------
// OPEN A PATIENT PROFILE
// ------------------------
import { doc, getDoc, setDoc } 
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

async function openPatient(bedNo) {
    currentBed = bedNo;

    const bedRef = doc(window.db, "patients", "bed" + bedNo);
    const bedSnap = await getDoc(bedRef);

    document.getElementById("pTitle").innerText = "Bed " + bedNo + " — Patient";

    if (bedSnap.exists()) {
        const data = bedSnap.data();
        document.getElementById("pName").value = data.name || "";
        document.getElementById("pMed").value = data.med || "";
        document.getElementById("pDose").value = data.dose || "";
        document.getElementById("pSchedule").value = data.schedule || "";
    } else {
        // Empty fields if data not found
        document.getElementById("pName").value = "";
        document.getElementById("pMed").value = "";
        document.getElementById("pDose").value = "";
        document.getElementById("pSchedule").value = "";
    }

    showScreen("patientScreen");
}

// ------------------------
// SAVE & SEND ROBOT
// ------------------------
async function savePatient() {
    if (!currentBed) return;

    const name = document.getElementById("pName").value;
    const med = document.getElementById("pMed").value;
    const dose = document.getElementById("pDose").value;
    const schedule = document.getElementById("pSchedule").value;

    const bedRef = doc(window.db, "patients", "bed" + currentBed);

    await setDoc(bedRef, {
        name,
        med,
        dose,
        schedule,
        robot_status: "moving"
    }, { merge: true });

    alert("Saved! Robot is on the way.");

    // Move to patient arrival greeting screen
    document.getElementById("pgName").innerText = name;
    document.getElementById("pgMedView").innerText = med;
    document.getElementById("pgDoseView").innerText = dose;
    document.getElementById("pgScheduleView").innerText = schedule;

    showScreen("patientGreetingScreen");
}

// ------------------------
// PATIENT CONFIRMATION
// ------------------------
async function confirmMedicine(received) {
    const bedRef = doc(window.db, "patients", "bed" + currentBed);

    await setDoc(bedRef, {
        robot_status: received ? "delivered" : "problem"
    }, { merge: true });

    document.getElementById("finalMsg").innerText =
        received ? "Medicine delivered successfully!" : "Robot will re-check delivery.";

    showScreen("thankScreen");
}

// ------------------------
// DASHBOARD FLOW
// ------------------------
function startDispenseFlow() {
    showScreen("dispenseScreen");
}

function goHome() {
    showScreen("welcomeScreen");
}

// ------------------------
// OPTIONAL — AUTO ROBOT STATUS DISPLAY
// ------------------------
import { onSnapshot, collection } 
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const pCol = collection(window.db, "patients");

onSnapshot(pCol, snapshot => {
    let msg = "Robot Idle";

    snapshot.forEach(doc => {
        const d = doc.data();
        if (d.robot_status === "moving") msg = "Robot moving to patient…";
        if (d.robot_status === "delivered") msg = "Delivery completed.";
        if (d.robot_status === "problem") msg = "Delivery encountered issue.";
    });

    document.getElementById("robotMsg").innerText = msg;
});

