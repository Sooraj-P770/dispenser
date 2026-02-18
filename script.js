// =====================================================
// MEDICAL DISPENSING ROBOT – 4 ROTOR VERSION
// =====================================================

// ================= RTDB IMPORTS =================
import {
  getDatabase,
  ref,
  set,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// 🔴 BIND RTDB to SAME Firebase app
const rtdb = getDatabase(window.firebaseApp);

// ================= FIRESTORE IMPORTS =================
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const db = window.db;

// =====================================================
// MEDICINE TO ROTOR MAPPING (4 ROTORS)
// =====================================================
const MEDICINE_ROTOR_MAP = {
  "paracetamol": "rotor1",
  "aspirin": "rotor2",
  "amoxicillin": "rotor3",
  "ibuprofen": "rotor4"
};

// =====================================================
// FIRESTORE LISTENER (Robot-driven UI)
// =====================================================
const taskRef = doc(db, "robotCommands", "activeTask");

onSnapshot(taskRef, async (snap) => {
  if (!snap.exists()) return;

  const data = snap.data();

  if (data.sub_status === "arrived") {
    const bed = data.queue[data.current_index];
    await loadPatientGreeting(bed);
  }
});

async function loadPatientGreeting(bedId) {
  const patientSnap = await getDoc(doc(db, "patients", bedId));
  if (!patientSnap.exists()) return;

  const patient = patientSnap.data();

  document.getElementById("greetingText").innerText =
    `Hello ${patient.name} — your medicine is here.`;

  document.getElementById("pgName").innerText = patient.name;

  document.getElementById("pgMedList").innerHTML =
    patient.medicines.map(m =>
      `<p>💊 ${m.name} × ${m.count} (${m.time})</p>`
    ).join("");

  showScreen("patientGreetingScreen");
}

// =====================================================
// STATE MANAGEMENT
// =====================================================
let selectedBed = null;
let dispenseQueue = [];
let medicinesTemp = [];
let tabletCount = 1;

// =====================================================
// UI NAVIGATION
// =====================================================
window.showScreen = function (id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
};

// =====================================================
// LOGIN (SIMPLE DEMO)
// =====================================================
window.revealLogin = () => {
  document.getElementById("loginForm").style.display = "block";
};

window.attemptLogin = () => {
  alert("Login Successful!");
  showScreen("dashboardScreen");
};

// =====================================================
// BED SELECTION
// =====================================================
window.openPatient = function (bedNo, name) {
  selectedBed = `bed${bedNo}`;
  medicinesTemp = [];

  document.getElementById("pTitle").innerText = `Patient Info - Bed ${bedNo}`;
  document.getElementById("pName").value = name;
  document.getElementById("medicineList").innerHTML = "";
  document.getElementById("medicineSelect").value = "";

  showScreen("patientScreen");
};

// =====================================================
// MEDICINE ENTRY
// =====================================================
window.openMedicineScreen = function () {
  const med = document.getElementById("medicineSelect").value;
  if (!med) return alert("Select a medicine");

  // Check if medicine already added
  if (medicinesTemp.find(m => m.name.toLowerCase() === med.toLowerCase())) {
    alert("This medicine is already added!");
    return;
  }

  document.getElementById("mName").value = med;
  document.getElementById("mTime").value = "";
  tabletCount = 1;
  document.getElementById("doseCount").innerText = tabletCount;

  showScreen("medicineScreen");
};

window.changeDose = function (delta) {
  tabletCount += delta;
  if (tabletCount < 1) tabletCount = 1;
  if (tabletCount > 10) tabletCount = 10;
  document.getElementById("doseCount").innerText = tabletCount;
};

window.saveMedicine = function () {
  const name = document.getElementById("mName").value;
  const time = document.getElementById("mTime").value;
  if (!time) return alert("Enter time");

  // Maximum 4 medicines (4 rotors available)
  if (medicinesTemp.length >= 4) {
    alert("Maximum 4 medicines supported (4 rotors available)");
    return;
  }

  medicinesTemp.push({ name, count: tabletCount, time });

  document.getElementById("medicineList").innerHTML =
    medicinesTemp.map(m =>
      `<p>💊 ${m.name} × ${m.count} (${m.time})</p>`
    ).join("");

  showScreen("patientScreen");
};

// =====================================================
// SAVE PATIENT (FIRESTORE)
// =====================================================
window.savePatient = async function () {
  if (!selectedBed || medicinesTemp.length === 0)
    return alert("Add medicine first");

  const name = document.getElementById("pName").value;

  await setDoc(doc(db, "patients", selectedBed), {
    name,
    bed: selectedBed,
    medicines: medicinesTemp,
    robot_status: "pending",
    timestamp: new Date().toISOString()
  });

  dispenseQueue.push({ bed: selectedBed, name, medicines: medicinesTemp });

  alert(`Patient ${name} saved successfully!`);
  showScreen("dashboardScreen");
};

// =====================================================
// START DISPENSE FLOW (4-ROTOR VERSION)
// =====================================================
window.startDispenseFlow = async function () {
  if (dispenseQueue.length === 0)
    return alert("No patients in queue");

  // Disable button to prevent double clicks
  const startBtn = document.querySelector('[onclick="startDispenseFlow()"]');
  const originalText = startBtn.textContent;
  startBtn.textContent = "Starting Delivery...";
  startBtn.disabled = true;

  try {
    const firstPatient = dispenseQueue[0];
    
    console.log("🚀 ===== STARTING DELIVERY PROCESS (4 ROTORS) =====");
    console.log(`📥 Step 1: Fetching LATEST patient data from Firestore...`);
    console.log(`   Patient Bed: ${firstPatient.bed}`);
    
    const patientDoc = await getDoc(doc(db, "patients", firstPatient.bed));
    
    if (!patientDoc.exists()) {
      throw new Error(`Patient ${firstPatient.bed} not found in Firestore!`);
    }
    
    const latestPatientData = patientDoc.data();
    const medicines = latestPatientData.medicines;
    
    console.log("✅ LATEST data retrieved:");
    console.log(`   Patient: ${latestPatientData.name}`);
    console.log(`   Total Medicines: ${medicines.length}`);
    console.log("   Medicines:", medicines);

    // Build medicine structure for 4 rotors
    const medicineStructure = {
      paracetamol: { count: 0, rotor: "rotor1", rotate: false },
      aspirin: { count: 0, rotor: "rotor2", rotate: false },
      amoxicillin: { count: 0, rotor: "rotor3", rotate: false },
      ibuprofen: { count: 0, rotor: "rotor4", rotate: false }
    };

    // Map patient medicines to rotor structure
    medicines.forEach(med => {
      const medName = med.name.toLowerCase();
      if (medicineStructure[medName]) {
        medicineStructure[medName].count = med.count;
      } else {
        console.warn(`⚠️ Medicine "${med.name}" not mapped to any rotor!`);
      }
    });

    console.log("🧠 Medicine Structure for RTDB:");
    console.log(JSON.stringify(medicineStructure, null, 2));

    // Update Firestore robotCommands
    console.log("📝 Step 2: Updating Firestore robotCommands...");
    await setDoc(doc(db, "robotCommands", "activeTask"), {
      queue: dispenseQueue.map(q => q.bed),
      current_index: 0,
      status: "moving",
      sub_status: "enroute",
      started_at: new Date().toISOString(),
      medicines: medicines
    });

    // Write to RTDB with 4-medicine structure
    console.log("📡 Step 3: Writing command to RTDB...");
    
    const cmdId = Date.now().toString();
    
    await set(ref(rtdb, "robot"), {
      command: {
        cmd_id: cmdId,
        medicines: medicineStructure
      },
      dispense_done: {
        rotor1: false,
        rotor2: false,
        rotor3: false,
        rotor4: false
      },
      status: "waiting_for_aruco"
    });

    console.log("✅ Command sent to RTDB:");
    console.log(`   cmd_id: ${cmdId}`);
    Object.entries(medicineStructure).forEach(([med, data]) => {
      if (data.count > 0) {
        console.log(`   ${med}: count=${data.count}, rotor=${data.rotor}, rotate=false`);
      }
    });

    // Update UI
    document.getElementById("robotStatus").innerText = "Waiting for ArUco Detection...";
    console.log("🎯 UI Updated: Status = 'Waiting for ArUco...'");

    // Wait and verify
    console.log("⏳ Step 4: Waiting for RTDB update (1 second)...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify what's in RTDB
    console.log("🔍 Step 5: Verifying RTDB state...");
    const snapshot = await get(ref(rtdb, "robot"));
    if (snapshot.exists()) {
      const rtdbData = snapshot.val();
      console.log("📊 Current RTDB state:", JSON.stringify(rtdbData, null, 2));
    }

    console.log("✅ ===== DELIVERY PROCESS INITIATED =====");
    alert("Delivery started! Waiting for ArUco marker detection...");

  } catch (error) {
    console.error("❌ ERROR in startDispenseFlow:", error);
    alert("Failed to start delivery. Check console for details.");
  } finally {
    // Re-enable button
    startBtn.textContent = originalText;
    startBtn.disabled = false;
  }
};

// =====================================================
// CONFIRM DELIVERY
// =====================================================
window.confirmMedicine = async function (received) {
  if (!received) {
    alert("Delivery cancelled");
    showScreen("dashboardScreen");
    return;
  }

  const patient = dispenseQueue.shift();

  await updateDoc(doc(db, "patients", patient.bed), {
    robot_status: "delivered"
  });
  await updateDoc(doc(db, "robotCommands", "activeTask"), {
    sub_status: "dispense_complete"
  });

  showScreen("thankScreen");
  
  // Auto-return to dashboard after 3 seconds
  setTimeout(() => {
    showScreen("dashboardScreen");
  }, 3000);
};

// =====================================================
// DATABASE MANAGEMENT TOOLS
// =====================================================
window.debugRTDB = async function () {
  console.log("🔍 ===== RTDB STATUS CHECK =====");
  try {
    const snapshot = await get(ref(rtdb, "robot"));
    if (snapshot.exists()) {
      console.log("📊 Current RTDB State:", JSON.stringify(snapshot.val(), null, 2));
      
      // Show in alert too
      const data = snapshot.val();
      let summary = "RTDB Status:\n\n";
      summary += `Status: ${data.status}\n`;
      summary += `Command ID: ${data.command.cmd_id}\n\n`;
      summary += "Medicines:\n";
      Object.entries(data.command.medicines).forEach(([med, info]) => {
        if (info.count > 0) {
          summary += `  ${med}: ${info.count} tablets (rotate: ${info.rotate})\n`;
        }
      });
      alert(summary);
    } else {
      console.log("📊 RTDB is empty at /robot path");
      alert("RTDB is empty!");
    }
  } catch (error) {
    console.error("❌ Status check failed:", error);
    alert("Failed to check status. See console.");
  }
};

window.resetRTDB = async function () {
  if (!confirm("⚠️ This will reset all RTDB data. Continue?")) return;
  
  try {
    console.log("🔄 Resetting RTDB data...");
    
    // Reset robot data
    await set(ref(rtdb, "robot"), {
      command: {
        cmd_id: "0",
        medicines: {
          paracetamol: { count: 0, rotor: "rotor1", rotate: false },
          aspirin: { count: 0, rotor: "rotor2", rotate: false },
          amoxicillin: { count: 0, rotor: "rotor3", rotate: false },
          ibuprofen: { count: 0, rotor: "rotor4", rotate: false }
        }
      },
      dispense_done: {
        rotor1: false,
        rotor2: false,
        rotor3: false,
        rotor4: false
      },
      status: "idle"
    });
    
    // Set the rotor-medicine mapping
    await set(ref(rtdb, "rotor_medicine_mapping"), {
      rotor1: "paracetamol",
      rotor2: "aspirin",
      rotor3: "amoxicillin",
      rotor4: "ibuprofen"
    });
    
    console.log("✅ RTDB reset successfully");
    alert("✅ RTDB reset successfully!");
    
  } catch (error) {
    console.error("❌ Reset operation failed:", error);
    alert("❌ Failed to reset RTDB. Check console.");
  }
};

// =====================================================
// HELPER: Show Queue Status
// =====================================================
window.showQueueStatus = function () {
  if (dispenseQueue.length === 0) {
    alert("Queue is empty");
    return;
  }
  
  let queueInfo = "Current Queue:\n\n";
  dispenseQueue.forEach((patient, index) => {
    queueInfo += `${index + 1}. ${patient.name} (${patient.bed})\n`;
    patient.medicines.forEach(med => {
      queueInfo += `   - ${med.name} × ${med.count}\n`;
    });
    queueInfo += "\n";
  });
  
  alert(queueInfo);
};

// =====================================================
// INIT
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Website Ready - 4-Rotor Medicine Dispenser");
  console.log("📋 Medicine-Rotor Mapping:");
  console.log("   Rotor 1 -> Paracetamol");
  console.log("   Rotor 2 -> Aspirin");
  console.log("   Rotor 3 -> Amoxicillin");
  console.log("   Rotor 4 -> Ibuprofen");
});
