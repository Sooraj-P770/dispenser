// ------------------------
// FIREBASE IMPORTS
// ------------------------
import {
    doc, getDoc, setDoc,
    onSnapshot, collection
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


// ------------------------
// SCREEN SYSTEM
// ------------------------
export function showScreen(id) {
    document.querySelectorAll(".screen")
        .forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}
window.showScreen = showScreen;


// ------------------------
// LOGIN
// ------------------------
window.revealLogin = function () {
    document.getElementById("loginForm").classList.remove("hidden-block");
};

window.attemptLogin = function () {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();

    if (u === "nurse" && p === "1234") {
        alert("Login successful");
        showScreen("dashboardScreen");
    } else {
        alert("Invalid login");
    }
};


// ------------------------
// PATIENT HANDLING
// ------------------------
let currentBed = null;

window.openPatient = async function (bed) {
    currentBed = bed;

    const ref = doc(window.db, "patients", "bed" + bed);
    const snap = await getDoc(ref);

    document.getElementById("pTitle").innerText = "Bed " + bed;

    if (snap.exists()) {
        const d = snap.data();
        document.getElementById("pName").value = d.name || "";
        document.getElementById("pMed").value = d.med || "";
        document.getElementById("pDose").value = d.dose || "";
        document.getElementById("pSchedule").value = d.schedule || "";
    }

    showScreen("patientScreen");
};


window.savePatient = async function () {
    if (!currentBed) return;

    const name = pName.value;
    const med = pMed.value;
    const dose = pDose.value;
    const schedule = pSchedule.value;

    await setDoc(doc(window.db, "patients", "bed" + currentBed), {
        name, med, dose, schedule,
        robot_status: "moving"
    }, { merge: true });

    pgName.innerText = name;
    pgMedView.innerText = med;
    pgDoseView.innerText = dose;
    pgScheduleView.innerText = schedule;

    alert("Robot is on the way!");
    showScreen("patientGreetingScreen");
};


// ------------------------
// CONFIRMATION
// ------------------------
window.confirmMedicine = async function (ok) {
    await setDoc(doc(window.db, "patients", "bed" + currentBed), {
        robot_status: ok ? "delivered" : "problem"
    }, { merge: true });

    finalMsg.innerText = ok ?
        "Medicine delivered successfully!" :
        "Robot will re-check shortly.";

    showScreen("thankScreen");
};


// ------------------------
// DASHBOARD FLOW
// ------------------------
window.startDispenseFlow = () => showScreen('dispenseScreen');
window.goHome = () => showScreen('welcomeScreen');


// ------------------------
// LIVE ROBOT STATUS
// ------------------------
const patientCol = collection(window.db, "patients");

onSnapshot(patientCol, snapshot => {
    let msg = "Robot Idle";

    snapshot.forEach(doc => {
        const d = doc.data();
        if (d.robot_status === "moving") msg = "Robot moving…";
        if (d.robot_status === "delivered") msg = "Delivery completed";
        if (d.robot_status === "problem") msg = "Problem occurred!";
    });

    document.getElementById("robotMsg").innerText = msg;
});
