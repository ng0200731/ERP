// Complete original admin functionality from admin.html
console.log('Admin original JS loaded');
// --- Rules UI Logic ---
const ruleNameOptions = [
  { value: 'email', label: 'Email' },
  { value: 'status', label: 'Status' },
  { value: 'permission', label: 'Permission Level' }
];
const ruleConditionOptions = [
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'equal', label: 'equal to' },
  { value: 'not_equal', label: 'not equal' }
];
const ruleStatusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Pending', label: 'Pending' }
];
const rulePermOptions = [
  { value: '1', label: 'Level 1 (Add/Edit)' },
  { value: '2', label: 'Level 2 (Add/Edit/Delete)' },
  { value: '3', label: 'Level 3 (Admin)' }
];
let rules = [ { name: '', condition: '', content: '' } ];
function renderRules() {
  const $list = $('#rules-list');
  $list.empty();
  const usedNames = rules.map(r => r.name);
  rules.forEach((rule, idx) => {
    // Only show unused names (except for this rule's current name)
    const availableNames = ruleNameOptions.filter(opt => !usedNames.includes(opt.value) || opt.value === rule.name);
    const nameSelect = `<select class="rule-name form-control" style="width:140px;display:inline-block;"><option value="">-- Select --</option>${availableNames.map(opt => `<option value="${opt.value}"${rule.name===opt.value?' selected':''}>${opt.label}</option>`).join('')}</select>`;
    // Condition options depend on name
    let condOpts = ruleConditionOptions;
    if (rule.name === 'status' || rule.name === 'permission') {
      condOpts = ruleConditionOptions.filter(opt => opt.value === 'equal' || opt.value === 'not_equal');
    }
    const condSelect = `<select class="rule-cond form-control" style="width:140px;display:inline-block;"><option value="">-- Select --</option>${condOpts.map(opt => `<option value="${opt.value}"${rule.condition===opt.value?' selected':''}>${opt.label}</option>`).join('')}</select>`;
    let contentField = '';
    if (rule.name === 'email') {
      contentField = `<input type="text" class="rule-content form-control" style="width:220px;display:inline-block;" value="${rule.content||''}" placeholder="Enter value...">`;
    } else if (rule.name === 'status') {
      contentField = `<select class="rule-content form-control" style="width:220px;display:inline-block;"><option value="">-- Select --</option>${ruleStatusOptions.map(opt => `<option value="${opt.value}"${rule.content===opt.value?' selected':''}>${opt.label}</option>`).join('')}</select>`;
    } else if (rule.name === 'permission') {
      contentField = `<select class="rule-content form-control" style="width:220px;display:inline-block;"><option value="">-- Select --</option>${rulePermOptions.map(opt => `<option value="${opt.value}"${rule.content==opt.value?' selected':''}>${opt.label}</option>`).join('')}</select>`;
    }
    let addBtn = '';
    let delBtn = '';
    if (idx === rules.length - 1) {
      addBtn = `<button class="btn btn-success btn-sm rule-add" style="margin-left:8px;">+</button>`;
      delBtn = idx > 0 ? `<button class="btn btn-danger btn-sm rule-del" style="margin-left:4px;">-</button>` : '';
    } else {
      delBtn = `<button class="btn btn-danger btn-sm rule-del" style="margin-left:4px;">-</button>`;
    }
    $list.append(`<div class="rule-row" data-idx="${idx}" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">${nameSelect}${condSelect}${contentField}${addBtn}${delBtn}</div>`);
  });
}
// Essential functions that need to be defined
function fetchAndRenderUsers(showLoading = true) {
  if (showLoading) {
    $('#users-table tbody').html('<tr><td colspan="7" class="text-center">Loading users...</td></tr>');
  }

  $.ajax({
    url: '/admin/users',
    method: 'GET',
    success: function(users) {
      console.log('Successfully fetched users:', users);
      updateUserTable(users);
    },
    error: function(xhr, status, error) {
      console.error('Error fetching users:', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText,
        error: error
      });
      $('#users-table tbody').html(`<tr><td colspan="7" class="text-center text-danger">Error loading users: ${xhr.status} ${xhr.statusText}</td></tr>`);
    }
  });
}

function setConvertPanelDisabled(disabled) {
  if (disabled) {
    $('.convert-panel').addClass('convert-disabled');
    $('.convert-panel-overlay').show();
  } else {
    $('.convert-panel').removeClass('convert-disabled');
    $('.convert-panel-overlay').hide();
  }
}

function clearConvertPanel() {
  $('#convert-panel-container').empty();
  window.convertToName = '';
  window.convertToContent = '';
}

$(document).ready(function() {
  // Always disable Convert to panel on page load
  setConvertPanelDisabled(true);
  fetchAndRenderUsers(false);
  renderRules();
  // Ensure panel is completely removed on page load
  clearConvertPanel();
  
  // Initialize latestChanges from localStorage if available
  try {
    const changesCache = JSON.parse(localStorage.getItem('userChangesCache') || '{}');
    window.latestChanges = { ...changesCache, ...(window.latestChanges || {}) };
    console.log('Loaded changes from cache:', window.latestChanges);
  } catch (e) {
    console.error('Could not load changes from localStorage:', e);
    window.latestChanges = window.latestChanges || {};
  }
  
  $('#rules-list').on('change', '.rule-name', function() {
    const idx = $(this).closest('.rule-row').data('idx');
    rules[idx].name = $(this).val();
    // Reset content when name changes
    rules[idx].content = '';
    renderRules();
  });
  $('#rules-list').on('change', '.rule-cond', function() {
    const idx = $(this).closest('.rule-row').data('idx');
    rules[idx].condition = $(this).val();
  });
  $('#rules-list').on('input change', '.rule-content', function() {
    const idx = $(this).closest('.rule-row').data('idx');
    rules[idx].content = $(this).val();
  });
  $('#rules-list').on('click', '.rule-add', function() {
    // Validate all fields before adding a new rule
    let allFilled = true;
    $('#rules-list .rule-row').each(function() {
      $(this).find('.form-control').css('background','');
      const name = $(this).find('.rule-name').val();
      const cond = $(this).find('.rule-cond').val();
      const content = $(this).find('.rule-content').val();
      if (!name || !cond || !content) {
        allFilled = false;
        if (!name) $(this).find('.rule-name').css('background','#ffd6d6');
        if (!cond) $(this).find('.rule-cond').css('background','#ffd6d6');
        if (!content) $(this).find('.rule-content').css('background','#ffd6d6');
      }
    });
    if (!allFilled) {
      alert('Please fill in all fields for every rule.');
      return;
    }
    // Find first unused name
    const usedNames = rules.map(r => r.name);
    let nextName = '';
    for (const opt of ruleNameOptions) {
      if (!usedNames.includes(opt.value)) {
        nextName = opt.value;
        break;
      }
    }
    let newRule = { name: nextName, condition: '', content: '' };
    // Negation logic for new rule content
    let prev = rules[rules.length-1];
    if (prev.name === 'status') {
      if (prev.content === 'Active') newRule.content = 'Inactive';
      else if (prev.content === 'Inactive') newRule.content = 'Active';
      else if (prev.content === 'Pending') newRule.content = 'Active';
      else newRule.content = 'Inactive';
    } else if (prev.name === 'permission') {
      if (prev.content === '1') newRule.content = '2';
      else if (prev.content === '2') newRule.content = '3';
      else if (prev.content === '3') newRule.content = '1';
      else newRule.content = '2';
    }
    rules.push(newRule);
    renderRules();
  });
  $('#rules-list').on('click', '.rule-del', function() {
    const idx = $(this).closest('.rule-row').data('idx');
    if (confirm('Are you sure you want to delete this rule?')) {
      rules.splice(idx, 1);
      renderRules();
    }
  });
  $(document).on('click', '.rule-search', function() {
    let allFilled = true;
    $('#rules-list .rule-row').each(function() {
      $(this).find('.form-control').css('background','');
      const name = $(this).find('.rule-name').val();
      const cond = $(this).find('.rule-cond').val();
      const content = $(this).find('.rule-content').val();
      if (!name || !cond || !content) {
        allFilled = false;
        if (!name) $(this).find('.rule-name').css('background','#ffd6d6');
        if (!cond) $(this).find('.rule-cond').css('background','#ffd6d6');
        if (!content) $(this).find('.rule-content').css('background','#ffd6d6');
      }
    });
    if (!allFilled) {
      alert('Please fill in all fields for every rule.');
      return;
    }
    // Send rules to backend for filtering
    $.ajax({
      url: '/admin/users/filter',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ rules }),
      success: function(res) {
        // Update user table with filtered results
        updateUserTable(res.users, true);
        
        // IMPORTANT: Explicitly check and render Convert panel if there are users
        if (res.users && res.users.length > 0) {
          // Initialize options, but don't set any active selection
          // The panel should start with --Select-- for all dropdowns
          
          // Initialize basic options without setting a selection
          window.convertToName = ''; // Empty means --Select--
          window.convertToContent = ''; // Empty means --Select--
          
          // Initialize Status options to defaults if not set
          window.convertToStatusOptions = ['Active', 'Inactive'];
          
          // Initialize Permission options
          window.convertToPermOptions = [
            { value: '1', label: 'Level 1 (Add/Edit)' },
            { value: '2', label: 'Level 2 (Add/Edit/Delete)' },
            { value: '3', label: 'Level 3 (Admin)' }
          ];
          
          // Still calculate appropriate negation options for reference
          if (rules.length > 0) {
            const rule = rules[0];
            
            // Store rule type but don't auto-select it
            window.lastRuleType = rule.name;
            
            if (rule.name === 'status') {
              // Calculate appropriate status negation - but don't select it
              const allStatus = res.users.map(u => u.status);
              const uniqueStatus = [...new Set(allStatus)];
              
              console.log('Search results status values:', uniqueStatus);
              
              if (uniqueStatus.length === 1) {
                // Consistent, calculate negation
                const negationValue = (uniqueStatus[0] === 'Active') ? 'Inactive' : 'Active';
                window.statusNegationValue = negationValue;
                window.convertToStatusOptions = ['Active', 'Inactive']; // Keep both but don't select
              }
            } else if (rule.name === 'permission') {
              // ... similar logic for permission, store negation info but don't select ...
            } else if (rule.name === 'email') {
              // ... existing email handling ...
            }
          }
          
          console.log('Convert panel options after search:', {
            name: window.convertToName,
            content: window.convertToContent,
            statusOptions: window.convertToStatusOptions,
            permOptions: window.convertToPermOptions
          });
          
          // Force render the Convert panel after a short delay
          setTimeout(function() {
            renderConvertToRule();
            // Make sure the panel is visible
            $('.convert-panel').css('display', 'block');
          }, 100);
        } else {
          // No users found, ensure panel is removed
          clearConvertPanel();
        }
      },
      error: function() {
        alert('Error filtering users.');
        clearConvertPanel(); // Remove panel on error
      }
    });
  });
  $(document).on('click', '.rule-cancel', function() {
    clearConvertPanel(); // Remove panel on reset
    // Reset the rules and refresh the user table
    rules = [ { name: '', condition: '', content: '' } ];
    renderRules();
    fetchAndRenderUsers(true);
  });
  $('#select-all-users').prop('checked', false);
});

function updateUserTable(users, selectAllChecked = null) {
  console.log('updateUserTable called with users:', users);
  try {
    const $tbody = $('#users-table tbody');
    $tbody.empty();
    if (!users || !users.length) {
      $tbody.append('<tr><td colspan="7" class="text-center">No users found.</td></tr>');
      clearConvertPanel();
      return;
    }

    // For debugging - log all users data structure to see available fields
    console.log('User data from server:', users);

  users.forEach(u => {
    let lastUpdate = null;
    let updateType = '';
    let isClientSide = false;
    let changeDetails = '';

    // First check if we have a client-side timestamp for this user
    if (window.latestChanges && window.latestChanges[u.id]) {
      const change = window.latestChanges[u.id];
      lastUpdate = change.timestamp;
      updateType = change.field;
      isClientSide = true;
      changeDetails = `${change.oldValue} → ${change.newValue}`;
    }
    // Otherwise check the server timestamps
    else if (u.last_updated) {
      lastUpdate = u.last_updated;
      updateType = 'Updated';
    } else if (u.updated_at) {
      lastUpdate = u.updated_at;
      updateType = 'Updated';
    } else if (u.last_login) {
      lastUpdate = u.last_login;
      updateType = 'Login';
    } else if (u.created_at) {
      lastUpdate = u.created_at;
      updateType = 'Created';
    } else if (u.registration_date) {
      lastUpdate = u.registration_date;
      updateType = 'Registered';
    } else if (u.approved_at) {
      lastUpdate = u.approved_at;
      updateType = 'Approved';
    }

    // Format the date and indicate if client-side
    let lastUpdated;
    if (lastUpdate) {
      const formattedDate = formatDateTime(lastUpdate);
      lastUpdated = isClientSide ?
        `<span style="color:#d14;">${updateType}: ${changeDetails} - ${formattedDate} (just now)</span>` :
        `${updateType}: ${formattedDate}`;
    } else {
      lastUpdated = 'No date available';
    }

    // Create quick edit buttons for single-user actions
    const actionButtons = `
      <div class="btn-group">
        <button class="btn btn-sm btn-outline-primary quick-edit-btn" data-id="${u.id}" title="Quick Edit">
          <i class="fa fa-pencil"></i> Edit
        </button>
        <button class="btn btn-sm btn-outline-secondary toggle-status-btn"
                data-id="${u.id}"
                data-current="${u.status}"
                title="${u.status === 'Active' ? 'Make Inactive' : 'Make Active'}">
          ${u.status === 'Active' ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn btn-sm btn-danger delete-user-btn" data-id="${u.id}" data-email="${u.email}" title="Delete">
          X
        </button>
      </div>`;

    $tbody.append(`
      <tr>
        <td><input type="checkbox" class="user-select-checkbox" data-id="${u.id}" data-email="${u.email}" data-level="${u.permission_level || ''}"></td>
        <td>${u.email}</td>
        <td>${u.status || ''}</td>
        <td>${u.permission_level || ''}</td>
        <td>${u.last_login ? formatDateTime(u.last_login) : 'Never'}</td>
        <td>${lastUpdated}</td>
        <td>${actionButtons}</td>
      </tr>
      <tr id="edit-row-${u.id}" class="edit-row" style="display:none;">
        <td colspan="7">
          <div class="card p-3 mb-0">
            <div class="form-row">
              <div class="col">
                <label>Status</label>
                <select class="form-control edit-status" data-id="${u.id}">
                  <option value="Active" ${u.status==='Active'?'selected':''}>Active</option>
                  <option value="Inactive" ${u.status==='Inactive'?'selected':''}>Inactive</option>
                </select>
              </div>
              <div class="col">
                <label>Permission Level</label>
                <select class="form-control edit-permission" data-id="${u.id}">
                  <option value="1" ${u.permission_level==1?'selected':''}>Level 1 (Add/Edit)</option>
                  <option value="2" ${u.permission_level==2?'selected':''}>Level 2 (Add/Edit/Delete)</option>
                  <option value="3" ${u.permission_level==3?'selected':''}>Level 3 (Admin)</option>
                </select>
              </div>
              <div class="col d-flex align-items-end">
                <button class="btn btn-success save-user-btn mr-2" data-id="${u.id}">Save</button>
                <button class="btn btn-secondary cancel-edit-btn" data-id="${u.id}">Cancel</button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `);
  });

    // Set checkboxes based on selectAllChecked param
    if (selectAllChecked === true) {
      $('#select-all-users').prop('checked', true);
      $('.user-select-checkbox:enabled').prop('checked', true);
    } else if (selectAllChecked === false) {
      $('#select-all-users').prop('checked', false);
      $('.user-select-checkbox:enabled').prop('checked', false);
    }
  } catch (error) {
    console.error('Error in updateUserTable:', error);
    $('#users-table tbody').html('<tr><td colspan="7" class="text-center text-danger">Error rendering user table</td></tr>');
  }
}

// Helper function to format date/time nicely
function formatDateTime(dateTimeStr) {
  try {
    const dt = new Date(dateTimeStr);
    if (isNaN(dt.getTime())) return 'Invalid date';

    // Format: "Apr 16, 2024 15:30"
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Date parsing error:', e, 'for dateTimeStr:', dateTimeStr);
    return 'Unknown';
  }
}

// --- Convert to Preset Rule Logic ---
const convertNameOptions = [
  { value: 'status', label: 'Status' },
  { value: 'permission', label: 'Permission Level' }
];
const convertStatusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];
const convertPermOptions = [
  { value: '1', label: 'Level 1 (Add/Edit)' },
  { value: '2', label: 'Level 2 (Add/Edit/Delete)' },
  { value: '3', label: 'Level 3 (Admin)' }
];
function renderConvertToRule() {
  let name = window.convertToName || '';
  let content = window.convertToContent || '';

  // Debug: Log the current options
  console.log('Rendering Convert panel with:', {
    name,
    content,
    permOptions: window.convertToPermOptions,
    statusOptions: window.convertToStatusOptions
  });

  // Ensure status options are set even if they weren't initialized elsewhere
  if (!window.convertToStatusOptions || window.convertToStatusOptions.length === 0) {
    window.convertToStatusOptions = ['Active', 'Inactive'];
    console.log('Initializing missing status options');
  }

  // Create a dropdown that allows selection between Status and Permission Level
  let nameSelect = `<select id="convert-to-name" class="form-control" style="width:160px;display:inline-block;">
    <option value=""${name===''?' selected':''}>-- Select --</option>
    <option value="status"${name==='status'?' selected':''}>Status</option>
    <option value="permission"${name==='permission'?' selected':''}>Permission Level</option>
  </select>`;

  let condText = '<span style="width:40px;display:inline-block;text-align:center;font-weight:600;">=</span>';

  // Prepare the content dropdown based on the selected name
  let contentSelect = '';
  if (name === 'status') {
    // Status must use text values
    if (!isNaN(content)) {
      content = '';
    }

    // Only show text status values - ensure options exist
    let statusOpts = window.convertToStatusOptions || ['Active', 'Inactive'];
    console.log('Using status options:', statusOpts);

    contentSelect = `<select id="convert-to-content" class="form-control" style="width:180px;display:inline-block;">
      <option value=""${content===''?' selected':''}>-- Select --</option>
      ${statusOpts.map(opt => `<option value="${opt}"${content===opt?' selected':''}>${opt}</option>`).join('')}
    </select>`;
  }
  else if (name === 'permission') {
    // Permission must use numeric levels
    if (content === 'Active' || content === 'Inactive') {
      content = '';
    }

    // If we're not in a "search with results" context, check selected rows now
    if (!window.convertToPermOptions || window.convertToPermOptions.length === 0) {
      const selectedPerms = $('.user-select-checkbox:checked').map(function() {
        return $(this).closest('tr').find('td:eq(3)').text().trim();
      }).get();

      if (selectedPerms.length > 0) {
        const uniquePerms = [...new Set(selectedPerms)];
        console.log('Selected permission levels:', uniquePerms);

        if (uniquePerms.length === 1) {
          // All selected rows have the same permission level
          // Force rebuild convertToPermOptions from scratch with the negation
          const currentLevel = uniquePerms[0];
          console.log('Single permission level detected:', currentLevel);

          // Explicitly create only the negation options
          window.convertToPermOptions = [];
          if (currentLevel !== '1' && currentLevel !== 1) {
            window.convertToPermOptions.push({ value: '1', label: 'Level 1 (Add/Edit)' });
          }
          if (currentLevel !== '2' && currentLevel !== 2) {
            window.convertToPermOptions.push({ value: '2', label: 'Level 2 (Add/Edit/Delete)' });
          }
          if (currentLevel !== '3' && currentLevel !== 3) {
            window.convertToPermOptions.push({ value: '3', label: 'Level 3 (Admin)' });
          }
        } else {
          // Mixed permissions, show all
          window.convertToPermOptions = [
            { value: '1', label: 'Level 1 (Add/Edit)' },
            { value: '2', label: 'Level 2 (Add/Edit/Delete)' },
            { value: '3', label: 'Level 3 (Admin)' }
          ];
        }
      } else {
        // Default if no selection
        window.convertToPermOptions = [
          { value: '1', label: 'Level 1 (Add/Edit)' },
          { value: '2', label: 'Level 2 (Add/Edit/Delete)' },
          { value: '3', label: 'Level 3 (Admin)' }
        ];
      }
    }
