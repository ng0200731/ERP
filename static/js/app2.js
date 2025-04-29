// ... existing code from app.js ... 
$(document).off('click', '.delete-user-btn');
$(document).on('click', '.delete-user-btn', function() {
  const id = $(this).data('id');
  const email = $(this).data('email');
  if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
  $.ajax({
    url: `/admin/users/${id}`,
    type: 'DELETE',
    success: function() {
      fetchAndRenderUsers();
    },
    error: function(xhr) {
      alert(xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Error deleting user');
    }
  });
}); 