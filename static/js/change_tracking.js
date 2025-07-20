/**
 * Change Tracking System for Quotation Edits
 * Handles the modal popup and change recording functionality
 */

// Global variables for change tracking
let pendingChanges = [];
let uploadedFiles = [];
let currentQuotationId = null;

// Fields to track for changes
const TRACKED_FIELDS = [
    'customer_item_code',
    'width', 
    'length',
    'quality',
    'flat_or_raised',
    'direct_or_reverse', 
    'thickness',
    'num_colors',
    'color_names',
    'price',
    'quotation_block'
];

// Field display names
const FIELD_DISPLAY_NAMES = {
    'customer_item_code': 'Item Code',
    'width': 'Width',
    'length': 'Length',
    'quality': 'Quality', 
    'flat_or_raised': 'Flat or Raised',
    'direct_or_reverse': 'Direct or Reverse',
    'thickness': 'Thickness',
    'num_colors': '# of Colors',
    'color_names': 'Color Names',
    'price': 'Price',
    'quotation_block': 'Quotation Block'
};

/**
 * Initialize change tracking for a quotation
 */
function initializeChangeTracking(quotationId) {
    currentQuotationId = quotationId;
    console.log('[Change Tracking] Initialized for quotation:', quotationId);
}

/**
 * Show the change tracking modal before saving changes
 */
function showChangeTrackingModal(changes) {
    pendingChanges = changes;
    
    // Populate changes summary
    displayChangesSummary(changes);
    
    // Reset form
    resetChangeTrackingForm();
    
    // Show modal
    document.getElementById('change-tracking-modal').style.display = 'flex';
}

/**
 * Close the change tracking modal
 */
function closeChangeModal() {
    document.getElementById('change-tracking-modal').style.display = 'none';
    resetChangeTrackingForm();
    pendingChanges = [];
    uploadedFiles = [];
}

/**
 * Reset the change tracking form
 */
function resetChangeTrackingForm() {
    document.getElementById('change-tracking-form').reset();
    document.getElementById('internal-reason-section').style.display = 'none';
    document.getElementById('other-reason-section').style.display = 'none';
    document.getElementById('external-proof-section').style.display = 'none';
    document.getElementById('save-changes-btn').disabled = true;
    document.getElementById('uploaded-files-list').innerHTML = '';
    uploadedFiles = [];
}

/**
 * Toggle change reason sections based on change type
 */
function toggleChangeReason() {
    const changeType = document.querySelector('input[name="change_type"]:checked')?.value;
    const internalSection = document.getElementById('internal-reason-section');
    const externalSection = document.getElementById('external-proof-section');
    const saveBtn = document.getElementById('save-changes-btn');
    
    if (changeType === 'internal') {
        internalSection.style.display = 'block';
        externalSection.style.display = 'none';
        saveBtn.disabled = false;
    } else if (changeType === 'external') {
        internalSection.style.display = 'none';
        externalSection.style.display = 'block';
        saveBtn.disabled = false;
    } else {
        internalSection.style.display = 'none';
        externalSection.style.display = 'none';
        saveBtn.disabled = true;
    }
    
    // Hide other reason detail when switching types
    document.getElementById('other-reason-section').style.display = 'none';
}

/**
 * Handle change reason dropdown
 */
document.addEventListener('DOMContentLoaded', function() {
    const changeReasonSelect = document.getElementById('change-reason');
    if (changeReasonSelect) {
        changeReasonSelect.addEventListener('change', function() {
            const otherSection = document.getElementById('other-reason-section');
            if (this.value === 'other') {
                otherSection.style.display = 'block';
            } else {
                otherSection.style.display = 'none';
            }
        });
    }
    
    // Word count for text areas
    setupWordCount('other-reason-detail');
    setupWordCount('proof-text');
});

/**
 * Setup word count for textarea
 */
function setupWordCount(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        const wordCountElement = textarea.parentElement.querySelector('.word-count');
        
        textarea.addEventListener('input', function() {
            const words = this.value.trim().split(/\s+/).filter(word => word.length > 0);
            const wordCount = this.value.trim() === '' ? 0 : words.length;
            
            if (wordCountElement) {
                wordCountElement.textContent = `${wordCount}/50 words`;
                
                if (wordCount > 50) {
                    wordCountElement.style.color = '#dc3545';
                    this.style.borderColor = '#dc3545';
                } else {
                    wordCountElement.style.color = '#666';
                    this.style.borderColor = '#ced4da';
                }
            }
        });
    }
}

/**
 * Handle file upload
 */
function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        const allowedExtensions = ['.eml', '.msg'];
        
        const isValidType = allowedTypes.includes(file.type) || 
                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValidType) {
            alert(`File type not supported: ${file.name}\nSupported types: Images (JPG, PNG, GIF), PDF, Email files`);
            return;
        }
        
        // Add to uploaded files
        uploadedFiles.push(file);
        displayUploadedFile(file);
    });
    
    // Clear input for next upload
    event.target.value = '';
}

/**
 * Display uploaded file in the list
 */
function displayUploadedFile(file) {
    const filesList = document.getElementById('uploaded-files-list');
    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.innerHTML = `
        <div class="file-info">
            <span>📎</span>
            <span>${file.name}</span>
            <small>(${(file.size / 1024).toFixed(1)} KB)</small>
        </div>
        <button type="button" class="file-remove" onclick="removeUploadedFile('${file.name}')">Remove</button>
    `;
    filesList.appendChild(fileDiv);
}

/**
 * Remove uploaded file
 */
function removeUploadedFile(fileName) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
    
    // Remove from display
    const filesList = document.getElementById('uploaded-files-list');
    const fileElements = filesList.querySelectorAll('.uploaded-file');
    fileElements.forEach(element => {
        if (element.textContent.includes(fileName)) {
            element.remove();
        }
    });
}

/**
 * Display changes summary in the modal
 */
function displayChangesSummary(changes) {
    const summaryDiv = document.getElementById('changes-summary');
    
    if (changes.length === 0) {
        summaryDiv.innerHTML = '<p>No changes detected.</p>';
        return;
    }
    
    let html = '';
    changes.forEach(change => {
        const displayName = FIELD_DISPLAY_NAMES[change.field_name] || change.field_name;
        html += `
            <div class="change-item">
                <div class="change-field">${displayName}</div>
                <div class="change-values">
                    <strong>From:</strong> ${change.old_value || '(empty)'}<br>
                    <strong>To:</strong> ${change.new_value || '(empty)'}
                </div>
            </div>
        `;
    });
    
    summaryDiv.innerHTML = html;
}

/**
 * Save changes with tracking information
 */
async function saveChanges() {
    try {
        const formData = new FormData(document.getElementById('change-tracking-form'));
        const changeType = formData.get('change_type');
        
        if (!changeType) {
            alert('Please select a change type (Internal or External)');
            return;
        }
        
        // Validate internal reason
        if (changeType === 'internal') {
            const changeReason = formData.get('change_reason');
            if (!changeReason) {
                alert('Please select a reason for internal changes');
                return;
            }
        }
        
        // Prepare change data
        const changeData = {
            change_type: changeType,
            change_reason: formData.get('change_reason'),
            change_reason_detail: formData.get('other_reason_detail') || formData.get('proof_text') || '',
            changes: pendingChanges,
            proof_attachments: uploadedFiles.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type
            }))
        };
        
        // Validate word count
        const detailText = changeData.change_reason_detail;
        if (detailText) {
            const wordCount = detailText.trim().split(/\s+/).filter(word => word.length > 0).length;
            if (wordCount > 50) {
                alert('Change reason detail must be 50 words or less');
                return;
            }
        }
        
        // Show loading state
        const saveBtn = document.getElementById('save-changes-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '💾 Saving...';
        saveBtn.disabled = true;
        
        // Send to server
        const response = await fetch(`/api/quotation/${currentQuotationId}/record-changes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(changeData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`✅ Changes recorded successfully!\n${result.recorded_changes} changes saved.`);
            closeChangeModal();
            
            // Now proceed with the actual quotation save
            if (window.proceedWithQuotationSave) {
                window.proceedWithQuotationSave();
            }
        } else {
            throw new Error(result.error || 'Failed to record changes');
        }
        
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('❌ Error saving changes: ' + error.message);
        
        // Restore button state
        const saveBtn = document.getElementById('save-changes-btn');
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

/**
 * Compare old and new quotation data to detect changes
 */
function detectChanges(oldData, newData) {
    const changes = [];
    
    TRACKED_FIELDS.forEach(field => {
        const oldValue = oldData[field] || '';
        const newValue = newData[field] || '';
        
        // Convert to strings for comparison
        const oldStr = String(oldValue).trim();
        const newStr = String(newValue).trim();
        
        if (oldStr !== newStr) {
            changes.push({
                field_name: field,
                display_name: FIELD_DISPLAY_NAMES[field] || field,
                old_value: oldStr,
                new_value: newStr
            });
        }
    });
    
    return changes;
}

// Export functions for global use
window.initializeChangeTracking = initializeChangeTracking;
window.showChangeTrackingModal = showChangeTrackingModal;
window.closeChangeModal = closeChangeModal;
window.toggleChangeReason = toggleChangeReason;
window.handleFileUpload = handleFileUpload;
window.removeUploadedFile = removeUploadedFile;
window.saveChanges = saveChanges;
window.detectChanges = detectChanges;
