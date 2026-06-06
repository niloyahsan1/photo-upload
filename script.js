const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzOrltoE6jdMmYEs8OFKpTUPDGZo6Q2szYSsDYrHfR8C5sccBuvw66tOVkVvEW26FPdSg/exec";

// DOM Elements
const uploadCard = document.getElementById("uploadCard");
const fileInput = document.getElementById("file");
const uploadArea = document.getElementById("uploadArea");
const previewImage = document.getElementById("previewImage");
const fileName = document.getElementById("fileName");
const fileMeta = document.getElementById("fileMeta");
const uploadBtn = document.getElementById("uploadBtn");
const cancelBtn = document.getElementById("cancelBtn");
const reuploadBtn = document.getElementById("reuploadBtn");
const successThumbnail = document.getElementById("successThumbnail");
const progressBarFill = document.getElementById("progressBarFill");
const toast = document.getElementById("toast");

let currentFile = null;
let currentObjectURL = null;
let progressInterval = null;

// Helper: Set UI state
function setCardState(state) {
    uploadCard.setAttribute("data-state", state);
}

// Helper: Show custom styled toast
function showToast(message, type = "success") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    // Clear any existing timeouts if we have them
    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }
    
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

// Helper: Format file size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Handle File Selection and verification
function handleFile(file) {
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith("image/")) {
        showToast("Please upload an image file (PNG, JPG, WEBP).", "error");
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast("File is too large. Maximum size allowed is 10MB.", "error");
        return;
    }

    currentFile = file;

    // Clean up previous object URL if any to avoid memory leaks
    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
    }

    currentObjectURL = URL.createObjectURL(file);
    previewImage.src = currentObjectURL;
    fileName.textContent = file.name;
    fileMeta.textContent = formatBytes(file.size);

    // Get image dimensions dynamically
    const img = new Image();
    img.onload = function() {
        fileMeta.textContent = `${formatBytes(file.size)} • ${this.width}×${this.height} px`;
    };
    img.src = currentObjectURL;

    setCardState("preview");
}

// Event Listeners for file selection
uploadArea.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
    }
});

// Drag and Drop support
["dragenter", "dragover"].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add("dragover");
    }, false);
});

["dragleave", "dragend", "drop"].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove("dragover");
    }, false);
});

uploadArea.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Cancel Selection
cancelBtn.addEventListener("click", () => {
    resetUploadState();
});

// Reupload Reset
reuploadBtn.addEventListener("click", () => {
    resetUploadState();
});

function resetUploadState() {
    fileInput.value = "";
    currentFile = null;
    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
        currentObjectURL = null;
    }
    previewImage.src = "";
    successThumbnail.src = "";
    progressBarFill.style.width = "0%";
    setCardState("upload");
}

// Simulated progress animation
function startProgressAnimation() {
    progressBarFill.style.width = "0%";
    let width = 0;
    progressInterval = setInterval(() => {
        if (width < 90) {
            width += Math.random() * 6 + 2; // incremental increase
            if (width > 90) width = 90;
            progressBarFill.style.width = `${width}%`;
        }
    }, 150);
}

function finishProgressAnimation() {
    clearInterval(progressInterval);
    progressBarFill.style.width = "100%";
}

// Upload Action
uploadBtn.addEventListener("click", async () => {
    if (!currentFile) {
        showToast("Please select a photo first.", "error");
        return;
    }

    setCardState("uploading");
    startProgressAnimation();

    const reader = new FileReader();
    reader.onload = async function () {
        try {
            const base64 = reader.result.split(",")[1];
            
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    name: currentFile.name,
                    type: currentFile.type,
                    file: base64,
                }),
            });

            // Even if apps script returns error or does not handle headers, let's verify response status
            if (response.ok) {
                finishProgressAnimation();
                // Delay slightly for smooth animation completion
                setTimeout(() => {
                    successThumbnail.src = currentObjectURL;
                    setCardState("success");
                    showToast("Photo uploaded successfully!", "success");
                }, 400);
            } else {
                throw new Error("Server returned an error status");
            }
        } catch (error) {
            clearInterval(progressInterval);
            progressBarFill.style.width = "0%";
            showToast("Upload failed. Please try again.", "error");
            setCardState("preview");
            console.error(error);
        }
    };

    reader.onerror = function() {
        clearInterval(progressInterval);
        progressBarFill.style.width = "0%";
        showToast("Error reading the image file.", "error");
        setCardState("preview");
    };

    reader.readAsDataURL(currentFile);
});
