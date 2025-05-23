$(document).ready(function() {
    // window.alert('[HTDB v1.0.8] JS loaded'); // Remove debug popup
    let htData = [];
    
    // Load data when page loads
    loadHtData();
    
    // Set up event handlers
    $('#upload-form').on('submit', handleFileUpload);
    $('#export-csv').on('click', exportToCsv);
    $('#manual-refresh').on('click', function() { loadHtData(); });
    
    // Fixed column order and display names
    const COLUMN_ORDER = [
        { key: 'quality', label: 'Quality' },
        { key: 'flat_or_raised', label: 'Flat or Raised' },
        { key: 'direct_or_reverse', label: 'Direct or Reverse' },
        { key: 'thickness', label: 'Thickness' },
        { key: 'num_colors', label: '# of Colors' },
        { key: 'length', label: 'Length' },
        { key: 'width', label: 'Width' },
        { key: 'price', label: 'Price' }
    ];
    
    // Function to show alert messages
    function showAlert(message, type) {
        const alertDiv = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`);
        $('#alerts').html(alertDiv);
    }

    // Handler for file upload
    function handleFileUpload(e) {
        // window.alert('[HTDB v1.0.8] Upload button clicked'); // Remove debug popup
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
        
        // Show loading state
        $('#loading-indicator').show();
        $('#ht-data-table').hide();
        showAlert('Uploading file...', 'info');
        
        $.ajax({
            url: '/ht_database/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhrFields: { withCredentials: true },
            success: function(response) {
                fileInput.value = '';
                showAlert(`File uploaded successfully (${response.row_count} rows)`, 'success');
                loadHtData();
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'Error uploading file';
                showAlert(errorMsg, 'danger');
                $('#loading-indicator').hide();
                $('#ht-data-table').show();
            }
        });
    }
    
    // Function to load HT data from server
    function loadHtData() {
        // window.alert('[HTDB v1.0.8] loadHtData called'); // Remove debug popup
        $('#loading-indicator').show();
        $('#ht-data-table').hide();
        
        $.ajax({
            url: '/ht_database/data',
            type: 'GET',
            xhrFields: { withCredentials: true },
            success: function(data) {
                if (Array.isArray(data.records)) {
                    htData = data.records;
                    renderDataTable();
                } else {
                    showAlert('Error: Invalid data format received', 'danger');
                }
                $('#loading-indicator').hide();
                $('#ht-data-table').show();
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : 'Error loading data';
                showAlert(errorMsg, 'danger');
                $('#loading-indicator').hide();
                $('#ht-data-table').show();
            }
        });
    }
    
    // Function to render the data table
    function renderDataTable() {
        const table = $('#ht-data-table');
        const tbody = table.find('tbody');
        tbody.empty();
        
        if (htData.length === 0) {
            $('#table-container').hide();
            $('#no-data-message').show();
            return;
        }
        
        $('#table-container').show();
        $('#no-data-message').hide();
        
        htData.forEach((row) => {
            const tr = $('<tr></tr>');
            COLUMN_ORDER.forEach(col => {
                const td = $('<td></td>');
                td.text(row[col.key] || '');
                tr.append(td);
            });
            tbody.append(tr);
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
}); 