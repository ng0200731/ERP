$(document).ready(function() {
    // Initialize the data table
    let htData = [];
    let editingCell = null;
    
    // Load data when page loads
    loadHtData();
    
    // Set up event handlers
    $('#upload-form').on('submit', handleFileUpload);
    $('#export-csv').on('click', exportToCsv);
    $('#ht-data-table').on('click', 'td', startEditing);
    $(document).on('click', function(e) {
        if (!$(e.target).closest('td').length && editingCell) {
            finishEditing();
        }
    });
    
    // Handler for file upload
    function handleFileUpload(e) {
        e.preventDefault();
        
        const fileInput = $('#excel-file')[0];
        if (fileInput.files.length === 0) {
            showAlert('Please select a file to upload', 'danger');
            return;
        }
        
        const file = fileInput.files[0];
        if (!file.name.endsWith('.xlsx')) {
            showAlert('Only Excel files (.xlsx) are allowed', 'danger');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        $.ajax({
            url: '/ht_database/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                showAlert('File uploaded successfully', 'success');
                loadHtData();
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'Error uploading file';
                showAlert(errorMsg, 'danger');
            }
        });
    }
    
    // Function to load HT data from server
    function loadHtData() {
        $.ajax({
            url: '/ht_database/data',
            type: 'GET',
            success: function(data) {
                htData = data;
                renderDataTable();
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'Error loading data';
                showAlert(errorMsg, 'danger');
            }
        });
    }
    
    // Function to render the data table
    function renderDataTable() {
        const table = $('#ht-data-table');
        table.empty();
        
        if (htData.length === 0) {
            $('#table-container').hide();
            $('#no-data-message').show();
            return;
        }
        
        $('#table-container').show();
        $('#no-data-message').hide();
        
        // Create table header
        const thead = $('<thead></thead>');
        const headerRow = $('<tr></tr>');
        
        // Get column names from the first object
        const columns = Object.keys(htData[0]);
        columns.forEach(column => {
            headerRow.append(`<th>${column.replace(/_/g, ' ')}</th>`);
        });
        
        thead.append(headerRow);
        table.append(thead);
        
        // Create table body
        const tbody = $('<tbody></tbody>');
        htData.forEach((row, rowIndex) => {
            const tr = $('<tr></tr>');
            
            columns.forEach(column => {
                const td = $('<td></td>');
                td.attr('data-row', rowIndex);
                td.attr('data-column', column);
                td.text(row[column] || '');
                tr.append(td);
            });
            
            tbody.append(tr);
        });
        
        table.append(tbody);
    }
    
    // Function to start cell editing
    function startEditing() {
        // Finish any previous editing
        if (editingCell) {
            finishEditing();
        }
        
        editingCell = $(this);
        const rowIndex = editingCell.data('row');
        const column = editingCell.data('column');
        const value = htData[rowIndex][column] || '';
        
        const input = $('<input type="text" class="form-control">');
        input.val(value);
        editingCell.html(input);
        input.focus();
        
        input.on('keydown', function(e) {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                cancelEditing();
            }
        });
    }
    
    // Function to finish cell editing
    function finishEditing() {
        if (!editingCell) return;
        
        const input = editingCell.find('input');
        const newValue = input.val();
        const rowIndex = editingCell.data('row');
        const column = editingCell.data('column');
        
        // Update the data
        htData[rowIndex][column] = newValue;
        editingCell.text(newValue);
        
        // Save changes to server
        saveChanges();
        
        editingCell = null;
    }
    
    // Function to cancel cell editing
    function cancelEditing() {
        if (!editingCell) return;
        
        const rowIndex = editingCell.data('row');
        const column = editingCell.data('column');
        const value = htData[rowIndex][column] || '';
        
        editingCell.text(value);
        editingCell = null;
    }
    
    // Function to save changes to server
    function saveChanges() {
        $.ajax({
            url: '/ht_database/update',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(htData),
            success: function(response) {
                showAlert('Changes saved successfully', 'success', true);
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'Error saving changes';
                showAlert(errorMsg, 'danger');
                loadHtData(); // Reload data to revert changes
            }
        });
    }
    
    // Function to export data to CSV
    function exportToCsv() {
        if (htData.length === 0) {
            showAlert('No data to export', 'warning');
            return;
        }
        
        window.location.href = '/ht_database/export_csv';
    }
    
    // Function to show alert messages
    function showAlert(message, type, autoHide = false) {
        const alertDiv = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`);
        
        $('#alerts').append(alertDiv);
        
        if (autoHide) {
            setTimeout(() => {
                alertDiv.alert('close');
            }, 3000);
        }
    }
}); 