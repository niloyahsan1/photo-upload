const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzOrltoE6jdMmYEs8OFKpTUPDGZo6Q2szYSsDYrHfR8C5sccBuvw66tOVkVvEW26FPdSg/exec";

// DOM Elements
const uploadCard = document.getElementById("uploadCard");
const fileInput = document.getElementById("file");
const uploadArea = document.getElementById("uploadArea");
const previewList = document.getElementById("previewList");
const addMoreBtn = document.getElementById("addMoreBtn");
const uploadBtnText = document.getElementById("uploadBtnText");
const uploadBtn = document.getElementById("uploadBtn");
const cancelBtn = document.getElementById("cancelBtn");
const reuploadBtn = document.getElementById("reuploadBtn");
const successHeading = document.getElementById("successHeading");
const successMessage = document.getElementById("successMessage");
const successGrid = document.getElementById("successGrid");
const uploadingTitle = document.getElementById("uploadingTitle");
const uploadingStatus = document.getElementById("uploadingStatus");
const progressBarFill = document.getElementById("progressBarFill");
const toast = document.getElementById("toast");

let selectedFiles = []; // Array of objects: { file, objectURL, dimensions }

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

// Helper: Escape HTML to avoid XSS in file names
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Render selected files preview list
function renderPreviewList() {
    previewList.innerHTML = "";
    
    if (selectedFiles.length === 0) {
        resetUploadState();
        return;
    }

    selectedFiles.forEach((fileObj, index) => {
        const item = document.createElement("div");
        item.className = "preview-item";
        
        const sizeStr = formatBytes(fileObj.file.size);
        const dimStr = fileObj.dimensions ? ` • ${fileObj.dimensions}` : "";
        const metaStr = `${sizeStr}${dimStr}`;

        item.innerHTML = `
            <div class="preview-item-thumbnail">
                <img src="${fileObj.objectURL}" alt="${escapeHtml(fileObj.file.name)}">
            </div>
            <div class="preview-item-info">
                <p class="preview-item-name" title="${escapeHtml(fileObj.file.name)}">${escapeHtml(fileObj.file.name)}</p>
                <p class="preview-item-meta">${metaStr}</p>
            </div>
            <button class="preview-item-remove" data-index="${index}" title="Remove file">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="remove-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
        
        // Add remove listener
        item.querySelector(".preview-item-remove").addEventListener("click", (e) => {
            e.stopPropagation();
            removeFile(index);
        });

        previewList.appendChild(item);
    });

    uploadBtnText.textContent = `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`;
}

// Handle File Selection and verification
function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    let addedCount = 0;
    let ignoredCount = 0;

    Array.from(files).forEach(file => {
        // Check if it's an image
        if (!file.type.startsWith("image/")) {
            showToast(`Skipped "${file.name}": Not an image file.`, "error");
            ignoredCount++;
            return;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast(`Skipped "${file.name}": Exceeds 10MB.`, "error");
            ignoredCount++;
            return;
        }

        // Prevent duplicates (by name and size)
        const isDuplicate = selectedFiles.some(f => f.file.name === file.name && f.file.size === file.size);
        if (isDuplicate) {
            ignoredCount++;
            return;
        }

        const objectURL = URL.createObjectURL(file);
        const fileObj = {
            file: file,
            objectURL: objectURL,
            dimensions: ""
        };

        selectedFiles.push(fileObj);
        addedCount++;

        // Get image dimensions dynamically
        const img = new Image();
        img.onload = function() {
            fileObj.dimensions = `${this.width}×${this.height} px`;
            renderPreviewList(); // Re-render to show dimensions once loaded
        };
        img.src = objectURL;
    });

    if (addedCount > 0) {
        renderPreviewList();
        setCardState("preview");
        if (ignoredCount > 0) {
            showToast(`Added ${addedCount} photo(s). ${ignoredCount} file(s) ignored.`, "success");
        } else {
            showToast(`Successfully added ${addedCount} photo(s).`, "success");
        }
    } else if (ignoredCount > 0) {
        showToast("No valid new photos were selected.", "error");
    }
}

// Remove single file
function removeFile(index) {
    if (index >= 0 && index < selectedFiles.length) {
        URL.revokeObjectURL(selectedFiles[index].objectURL);
        selectedFiles.splice(index, 1);
        renderPreviewList();
    }
}

// Event Listeners for file selection
uploadArea.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files);
});

// Add More button listener
addMoreBtn.addEventListener("click", () => {
    fileInput.click();
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
    handleFiles(files);
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
    // Revoke all object URLs to free memory
    selectedFiles.forEach(fileObj => {
        URL.revokeObjectURL(fileObj.objectURL);
    });
    selectedFiles = [];
    progressBarFill.style.width = "0%";
    setCardState("upload");
}

// Helpers for upload progress and conversions
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

function updateOverallProgress(currentIndex, totalFiles, fileProgressPercent) {
    const baseProgress = (currentIndex / totalFiles) * 100;
    const currentFileContribution = (fileProgressPercent / 100) * (100 / totalFiles);
    const overallProgress = baseProgress + currentFileContribution;
    progressBarFill.style.width = `${Math.min(overallProgress, 100)}%`;
}

function renderSuccessState(successList) {
    successGrid.innerHTML = "";
    
    successHeading.textContent = "Upload Successful!";
    successMessage.textContent = `Thank you. ${successList.length} photo${successList.length > 1 ? 's' : ''} submitted successfully.`;

    successList.forEach(fileObj => {
        const imgWrapper = document.createElement("div");
        imgWrapper.className = "success-thumbnail-item";
        
        const img = document.createElement("img");
        img.src = fileObj.objectURL;
        img.alt = fileObj.file.name;
        
        imgWrapper.appendChild(img);
        successGrid.appendChild(imgWrapper);
    });

    setCardState("success");
}

// Upload Action
uploadBtn.addEventListener("click", async () => {
    if (selectedFiles.length === 0) {
        showToast("Please select photos first.", "error");
        return;
    }

    setCardState("uploading");
    uploadingTitle.textContent = `Uploading ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`;
    
    let uploadedCount = 0;
    const totalFiles = selectedFiles.length;
    const successList = [];

    for (let i = 0; i < totalFiles; i++) {
        const fileObj = selectedFiles[i];
        uploadingStatus.textContent = `Uploading "${fileObj.file.name}" (${i + 1} of ${totalFiles})...`;
        updateOverallProgress(i, totalFiles, 0);

        // Simulate local progress during upload process
        let localProgress = 0;
        const progressTimer = setInterval(() => {
            if (localProgress < 90) {
                localProgress += Math.random() * 15 + 5;
                if (localProgress > 90) localProgress = 90;
                updateOverallProgress(i, totalFiles, localProgress);
            }
        }, 100);

        try {
            const base64 = await fileToBase64(fileObj.file);
            
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    name: fileObj.file.name,
                    type: fileObj.file.type,
                    file: base64,
                }),
            });

            clearInterval(progressTimer);

            if (response.ok) {
                updateOverallProgress(i, totalFiles, 100);
                uploadedCount++;
                successList.push(fileObj);
            } else {
                throw new Error(`Failed to upload ${fileObj.file.name}`);
            }
        } catch (error) {
            clearInterval(progressTimer);
            console.error(error);
            showToast(`Failed to upload "${fileObj.file.name}".`, "error");
        }
    }

    // Process completion
    if (uploadedCount === totalFiles) {
        progressBarFill.style.width = "100%";
        setTimeout(() => {
            renderSuccessState(successList);
            showToast(`All ${totalFiles} photo(s) uploaded successfully!`, "success");
        }, 400);
    } else if (uploadedCount > 0) {
        progressBarFill.style.width = "100%";
        setTimeout(() => {
            renderSuccessState(successList);
            showToast(`Uploaded ${uploadedCount} of ${totalFiles} photos.`, "warning");
        }, 400);
    } else {
        progressBarFill.style.width = "0%";
        showToast("Upload failed. Please check your network and try again.", "error");
        setCardState("preview");
    }
});
