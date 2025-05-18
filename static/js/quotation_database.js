$(function() {
  // File upload handling
  $('#upload-form').on('submit', function(e) {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = $('#excel-file')[0];
    if (!fileInput.files.length) {
      alert('Please select a file to upload');
      return;
    }
    formData.append('file', fileInput.files[0]);

    $.ajax({
      url: '/quotation-database/upload',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        alert('File uploaded successfully');
        location.reload();
      },
      error: function(xhr) {
        alert(xhr.responseJSON?.error || 'Error uploading file');
      }
    });
  });

  // Edit entry
  $('.edit-btn').on('click', function() {
    const id = $(this).data('id');
    const row = $(this).closest('tr');
    
    $('#edit-id').val(id);
    $('#edit-product-name').val(row.find('td:eq(1)').text());
    $('#edit-category').val(row.find('td:eq(2)').text());
    $('#edit-price').val(row.find('td:eq(3)').text().replace('$', ''));
    
    $('#editModal').modal('show');
  });

  // Save edit
  $('#save-edit-btn').on('click', function() {
    const id = $('#edit-id').val();
    const data = {
      product_name: $('#edit-product-name').val(),
      category: $('#edit-category').val(),
      price: $('#edit-price').val()
    };

    $.ajax({
      url: `/quotation-database/${id}`,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function() {
        $('#editModal').modal('hide');
        location.reload();
      },
      error: function(xhr) {
        alert(xhr.responseJSON?.error || 'Error updating entry');
      }
    });
  });

  // Delete entry
  $('.delete-btn').on('click', function() {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    const id = $(this).data('id');
    $.ajax({
      url: `/quotation-database/${id}`,
      type: 'DELETE',
      success: function() {
        location.reload();
      },
      error: function(xhr) {
        alert(xhr.responseJSON?.error || 'Error deleting entry');
      }
    });
  });
}); 