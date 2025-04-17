// Remove LocalStorage and in-memory array logic
// Use AJAX to communicate with Flask backend
let customers = [];
let currentCustomer = null;
let slide1Data = {};
let slide2Data = {};
let editStep1Data = {};
let editStep2Data = {};

function fetchCustomers(callback) {
  $.get('http://localhost:5000/customers', function(data) {
    customers = data;
    if (callback) callback();
  });
}

function createCustomer(customer, callback) {
  $.ajax({
    url: 'http://localhost:5000/customers',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(customer),
    success: function() { if (callback) callback(); }
  });
}

function updateCustomer(id, customer, callback) {
  $.ajax({
    url: 'http://localhost:5000/customers/' + id,
    type: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(customer),
    success: function() { if (callback) callback(); }
  });
}

$(function() {
  // On load, fetch customers from backend
  fetchCustomers(function() {
    // Optionally show the customer list or welcome page
  });

  // Left frame navigation
  $('#btn-customer').click(function() {
    $('#customer-nested').toggle();
  });
  $('#btn-development').click(function() {
    $('#right-frame').html('<h2>Development Section</h2><p>Coming soon...</p>');
  });
  $('#btn-create').click(showCreateSlide1);
  $('#btn-modify').click(showModify);

  // Delegated events for dynamic content
  $('#right-frame').on('click', '#next-slide1', handleNextSlide1);
  $('#right-frame').on('click', '#prev-slide2', showCreateSlide1);
  $('#right-frame').on('click', '#submit-slide2', handleSubmitSlide2);
  $('#right-frame').on('click', '.add-domain', addDomainField);
  $('#right-frame').on('click', '.remove-domain', removeDomainField);
  $('#right-frame').on('input', '.website-input', validateWebsite);
  $('#right-frame').on('input', '.search-input', handleSearchInput);
  $('#right-frame').on('click', '.edit-btn', handleEditCustomer);
  $('#right-frame').on('click', '#update-customer', handleUpdateCustomer);

  // Add these for edit domain
  $('#right-frame').on('click', '#edit-domain-list .add-domain', addEditDomainField);
  $('#right-frame').on('click', '#edit-domain-list .remove-domain', removeEditDomainField);

  // Update showCustomerList to always fetch from backend
  $('#right-frame').on('click', '#back-to-create', showCreateSlide1);

  // Remove highlight on input
  $('#right-frame').on('input', '#person-name, #person-position, #email-prefix, #person-tel, #person-brand', function() {
    $(this).removeClass('highlight-error');
  });

  // Add debug button to left frame
  if ($('#debug-btn').length === 0) {
    $('.left-frame').append('<button id="debug-btn">Debug: Print DB</button>');
  }
  $(document).on('click', '#debug-btn', function() {
    console.log('Current customers array:', customers);
    console.log('Raw LocalStorage:', localStorage.getItem('customers'));
    alert('Check the browser console for database debug info.');
  });

  $('#right-frame').on('click', '#next-edit-step1', function() {
    console.log('Next Edit Step 1 clicked');
    // Save step 1 edits
    editStep1Data.company = $('#edit-company').val().trim();
    editStep1Data.address = $('#edit-address').val().trim();
    editStep1Data.website = $('#edit-website').val().trim();
    // Get domains from the edit domain inputs
    editStep1Data.domains = [];
    $('#edit-domain-list .edit-domain-input').each(function() {
      const d = $(this).val().trim();
      if (d) editStep1Data.domains.push(d);
    });
    console.log('DEBUG after Step 1:', editStep1Data);
    // If coming from a customer with multiple key people, ensure editStep2Data.keyPeople is an array
    if (currentCustomer && Array.isArray(currentCustomer.keyPeople) && currentCustomer.keyPeople.length > 0) {
      editStep2Data.keyPeople = currentCustomer.keyPeople.map(kp => ({ ...kp }));
    } else if (currentCustomer && currentCustomer.keyPeople) {
      editStep2Data.keyPeople = [ { ...currentCustomer.keyPeople[0] } ];
    }
    console.log('Calling showEditCustomerStep2 with editStep2Data:', editStep2Data);
    showEditCustomerStep2();
  });
  $('#right-frame').on('click', '#prev-edit-step2', function() {
    showEditCustomerStep1();
  });
});
  
// --- Create Customer Flow ---
  
function showCreateSlide1() {
  // Use existing slide1Data or default
  const company = slide1Data.company || '';
  const address = slide1Data.address || '';
  const website = slide1Data.website || '';
  const domains = slide1Data.domains && slide1Data.domains.length > 0 ? slide1Data.domains : [''];
  $('#right-frame').html(`
    <h2>Create Customer - Step 1</h2>
    <div>
      <label>Company Name:<br><input type="text" id="company-name" value="${company}"></label><br>
      <label>Address:<br><input type="text" id="address" value="${address}"></label><br>
      <label>Website:<br>
        <input type="text" class="website-input" id="website" value="${website}">
        <span class="error" id="website-error"></span>
      </label><br>
      <div class="domain-list" id="domain-list">
        <label>Domain(s):</label>
        ${domains.map((d, i) => `
          <div class="domain-item">
            <input type="text" class="domain-input" value="${d}">
            <button type="button" class="${i === domains.length - 1 ? 'add-domain' : 'remove-domain'}">${i === domains.length - 1 ? '+' : '-'}</button>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="slide-nav">
      <button id="next-slide1">Next</button>
    </div>
  `);
  updateDomainButtons();
}
  
function addDomainField() {
  $('#domain-list').append(`
    <div class="domain-item">
      <input type="text" class="domain-input" value="">
      <button type="button" class="add-domain">+</button>
    </div>
  `);
  updateDomainButtons();
}
  
function removeDomainField() {
  $(this).closest('.domain-item').remove();
  updateDomainButtons();
}
  
function updateDomainButtons() {
  const items = $('#domain-list .domain-item');
  items.each(function(index) {
    const btn = $(this).find('button');
    if (index === items.length - 1) {
      btn.text('+').removeClass('remove-domain').addClass('add-domain');
    } else {
      btn.text('-').removeClass('add-domain').addClass('remove-domain');
    }
  });
}
  
function validateWebsite() {
  const val = $('#website').val();
  if (val.includes('@')) {
    $('#website-error').text('Website cannot contain "@"');
  } else {
    $('#website-error').text('');
  }
}
  
function handleNextSlide1() {
  // Validate
  const company = $('#company-name').val().trim();
  const address = $('#address').val().trim();
  const website = $('#website').val().trim();
  const domains = [];
  $('.domain-input').each(function() {
    const d = $(this).val().trim();
    if (d) domains.push(d);
  });
  let problems = [];
  if (!company) {
    problems.push('Company name is required');
    $('#company-name').addClass('highlight-error');
  } else {
    $('#company-name').removeClass('highlight-error');
  }
  if (!address) {
    problems.push('Address is required');
    $('#address').addClass('highlight-error');
  } else {
    $('#address').removeClass('highlight-error');
  }
  if (!website) {
    problems.push('Website is required');
    $('#website').addClass('highlight-error');
  } else {
    $('#website').removeClass('highlight-error');
  }
  if (domains.length === 0) {
    problems.push('At least one domain is required');
    $('.domain-input').addClass('highlight-error');
  } else {
    $('.domain-input').removeClass('highlight-error');
  }
  if (website.includes('@')) {
    problems.push('Website cannot contain "@"');
    $('#website').addClass('highlight-error');
  }
  if (problems.length > 0) {
    showCustomPopup('Please fix the following:\n' + problems.join('\n'), true);
    return false; // Prevent going to page 2
  }
  slide1Data = { company, address, website, domains };
  showCreateSlide2();
}
  
function showCreateSlide2() {
  // Use existing slide2Data or default: array of key people
  let keyPeople = Array.isArray(slide2Data.keyPeople) && slide2Data.keyPeople.length > 0
    ? slide2Data.keyPeople
    : [{ name: '', position: '', email: '', tel: '', brand: '' }];

  function renderKeyPeopleForms() {
    return keyPeople.map((kp, idx) => {
      let emailPrefix = kp.email && kp.email.includes('@') ? kp.email.split('@')[0] : '';
      let emailDomain = kp.email && kp.email.includes('@') ? kp.email.split('@')[1] : (slide1Data.domains && slide1Data.domains[0] ? slide1Data.domains[0] : '');
      let domainSelect = '';
      if (slide1Data.domains.length > 1) {
        domainSelect = `<select class="keyperson-email-domain">${slide1Data.domains.map(d => `<option value="${d}"${d===emailDomain?' selected':''}>${d}</option>`).join('')}</select>`;
      } else {
        domainSelect = `<input type="text" value="${slide1Data.domains[0] || ''}" disabled class="keyperson-email-domain">`;
      }
      return `
        <div class="keyperson-form" data-index="${idx}">
          <hr>
          <label>Name:<br><input type="text" class="person-name" value="${kp.name || ''}"></label><br>
          <label>Position:<br><input type="text" class="person-position" value="${kp.position || ''}"></label><br>
          <label>Email:<br>
            <input type="text" class="email-prefix" placeholder="prefix" value="${emailPrefix}">
            @
            ${domainSelect}
          </label><br>
          <label>Tel:<br><input type="text" class="person-tel" value="${kp.tel || ''}"></label><br>
          <label>Brand:<br><input type="text" class="person-brand" value="${kp.brand || ''}"></label><br>
          <button type="button" class="remove-keyperson" ${keyPeople.length === 1 ? 'disabled' : ''}>Remove</button>
        </div>
      `;
    }).join('');
  }

  $('#right-frame').html(`
    <h2>Create Customer - Step 2</h2>
    <div id="keypeople-list">
      ${renderKeyPeopleForms()}
    </div>
    <button type="button" id="add-keyperson">Add Key Person</button>
    <div class="slide-nav">
      <button id="prev-slide2">Previous</button>
      <button id="submit-slide2">Submit</button>
    </div>
  `);
}

// Add event handlers for key people UI
$(function() {
  // Add key person
  $('#right-frame').on('click', '#add-keyperson', function() {
    if (!Array.isArray(slide2Data.keyPeople)) slide2Data.keyPeople = [];
    slide2Data.keyPeople.push({ name: '', position: '', email: '', tel: '', brand: '' });
    showCreateSlide2();
  });
  // Remove key person
  $('#right-frame').on('click', '.remove-keyperson', function() {
    const idx = $(this).closest('.keyperson-form').data('index');
    if (Array.isArray(slide2Data.keyPeople) && slide2Data.keyPeople.length > 1) {
      slide2Data.keyPeople.splice(idx, 1);
      showCreateSlide2();
    }
  });
  // Save key people data on input
  $('#right-frame').on('input', '.keyperson-form input, .keyperson-form select', function() {
    const forms = $('.keyperson-form');
    slide2Data.keyPeople = [];
    forms.each(function() {
      const $form = $(this);
      const name = $form.find('.person-name').val().trim();
      const position = $form.find('.person-position').val().trim();
      const emailPrefix = $form.find('.email-prefix').val().trim();
      let domain = '';
      if ($form.find('.keyperson-email-domain').is('select')) {
        domain = $form.find('.keyperson-email-domain').val();
      } else {
        domain = $form.find('.keyperson-email-domain').val();
      }
      const email = emailPrefix && domain ? `${emailPrefix}@${domain}` : '';
      const tel = $form.find('.person-tel').val().trim();
      const brand = $form.find('.person-brand').val().trim();
      slide2Data.keyPeople.push({ name, position, email, tel, brand });
    });
  });
});

// Update navigation to save/load all key people
$(function() {
  $('#right-frame').on('click', '#prev-slide2', function() {
    // Save key people data before going back
    const forms = $('.keyperson-form');
    slide2Data.keyPeople = [];
    forms.each(function() {
      const $form = $(this);
      const name = $form.find('.person-name').val().trim();
      const position = $form.find('.person-position').val().trim();
      const emailPrefix = $form.find('.email-prefix').val().trim();
      let domain = '';
      if ($form.find('.keyperson-email-domain').is('select')) {
        domain = $form.find('.keyperson-email-domain').val();
      } else {
        domain = $form.find('.keyperson-email-domain').val();
      }
      const email = emailPrefix && domain ? `${emailPrefix}@${domain}` : '';
      const tel = $form.find('.person-tel').val().trim();
      const brand = $form.find('.person-brand').val().trim();
      slide2Data.keyPeople.push({ name, position, email, tel, brand });
    });
    showCreateSlide1();
  });
});

function handleSubmitSlide2() {
  // Remove previous highlights
  $('#person-name, #person-position, #email-prefix, #person-tel, #person-brand').removeClass('highlight-error');

  // Validate all key people
  let problems = [];
  const forms = $('.keyperson-form');
  const keyPeople = [];
  forms.each(function() {
    const $form = $(this);
    const name = $form.find('.person-name').val().trim();
    const position = $form.find('.person-position').val().trim();
    const emailPrefix = $form.find('.email-prefix').val().trim();
    let domain = '';
    if ($form.find('.keyperson-email-domain').is('select')) {
      domain = $form.find('.keyperson-email-domain').val();
    } else {
      domain = $form.find('.keyperson-email-domain').val();
    }
    const email = emailPrefix && domain ? `${emailPrefix}@${domain}` : '';
    const tel = $form.find('.person-tel').val().trim();
    const brand = $form.find('.person-brand').val().trim();
    if (!name) problems.push('Name is required');
    if (!position) problems.push('Position is required');
    if (!emailPrefix) problems.push('Email prefix is required');
    if (!tel) problems.push('Tel is required');
    if (!brand) problems.push('Brand is required');
    keyPeople.push({ name, position, email, tel, brand });
  });
  if (problems.length > 0) {
    showCustomPopup('Please fix the following:\n' + problems.join('\n'), true);
    return;
  }
  const now = new Date().toISOString().slice(0,16).replace('T',' ');
  const customer = {
    company: slide1Data.company,
    address: slide1Data.address,
    website: slide1Data.website,
    domains: slide1Data.domains,
    created: now,
    updated: now,
    keyPeople: keyPeople
  };
  createCustomer(customer, function() {
    // Clear form data for next user
    slide1Data = {};
    slide2Data = {};
    fetchCustomers(function() {
      showCustomPopup('Customer successfully submitted!');
      showCustomerList(true);
    });
  });
}
  
// Add a global popup container to the body if not present
function ensurePopupContainer() {
  if ($('#global-popup-container').length === 0) {
    $('body').append('<div id="global-popup-container"></div>');
  }
}

function showCustomPopup(message, isError) {
  ensurePopupContainer();
  // Remove any existing popup
  $('#global-popup-container .popup-success').remove();
  $('#global-popup-container').append(
    `<div class="popup-success${isError ? ' popup-error' : ''}">${message}</div>`
  );
  setTimeout(() => {
    $('#global-popup-container .popup-success').fadeOut(500, function() { $(this).remove(); });
  }, 1500);
}
  
// Update showCustomerList to always use the latest customers array
function showCustomerList(showSuccess, customMessage) {
  fetchCustomers(function() {
    const list = [...customers].sort((a, b) => (b.updated > a.updated ? 1 : b.updated < a.updated ? -1 : 0));
    $('#right-frame').html(`
      <h2>Customer List</h2>
      ${showSuccess ? `<div class="submission-success">${customMessage || 'Customer successfully submitted!'}</div>` : ''}
      <table class="table-search">
        <tr>
          <th>Company</th>
          <th>Address</th>
          <th>Website</th>
          <th>Domains</th>
          <th>Created</th>
          <th>Updated</th>
          <th>Action</th>
        </tr>
        <tbody>
          ${list.map(c => `
            <tr>
              <td>${c.company}</td>
              <td>${c.address}</td>
              <td>${c.website}</td>
              <td>${c.domains ? c.domains.split ? c.domains.split(',').join('<br>') : c.domains.join('<br>') : ''}</td>
              <td>${c.created ? localTimeString(c.created) : ''}</td>
              <td>${c.updated ? localTimeString(c.updated) : ''}</td>
              <td><button class="edit-btn" data-id="${c.id}">Edit</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <button id="back-to-create">Create Another</button>
    `);
  });
}
  
// --- Modify Customer Flow ---
  
function showModify() {
  window.expandedCompanyId = null;
  $('#right-frame').html(`
    <h2>Modify Customer</h2>
    <table class="table-search">
      <tr>
        <th>Company<br><input type="text" class="search-input" data-field="company"></th>
        <th>Address<br><input type="text" class="search-input" data-field="address"></th>
        <th>Website<br><input type="text" class="search-input" data-field="website"></th>
        <th>Created</th>
        <th>Updated</th>
        <th>Action</th>
      </tr>
      <tbody id="search-results"></tbody>
    </table>
  `);
  renderSearchResultsWithKeyPeople(customers);
}
  
function handleSearchInput() {
  window.expandedCompanyId = null;
  const filters = {};
  $('.search-input').each(function() {
    filters[$(this).data('field')] = $(this).val().toLowerCase();
  });
  const filtered = customers.filter(c =>
    (!filters.company || c.company.toLowerCase().includes(filters.company)) &&
    (!filters.address || c.address.toLowerCase().includes(filters.address)) &&
    (!filters.website || c.website.toLowerCase().includes(filters.website))
  );
  renderSearchResultsWithKeyPeople(filtered);
}
  
// Helper to display UTC/server time as local time string in 'YYYY-MM-DD HH:mm' format, removing microseconds
function localTimeString(utcString) {
  if (!utcString) return '';
  // Remove microseconds if present (e.g., .433810)
  const cleaned = utcString.replace(/\.[0-9]+/, '');
  const d = new Date(cleaned);
  if (isNaN(d)) return utcString;
  const pad = n => n < 10 ? '0' + n : n;
  return (
    d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes())
  );
}

function renderSearchResultsWithKeyPeople(list) {
  // Always sort by updated time descending
  const sorted = [...list].sort((a, b) => (b.updated > a.updated ? 1 : b.updated < a.updated ? -1 : 0));
  let expandedId = window.expandedCompanyId !== undefined ? window.expandedCompanyId : null;
  let html = '';
  sorted.forEach((c, idx) => {
    html += `
      <tr class="company-row" data-idx="${idx}" data-id="${c.id}">
        <td>${c.company}</td>
        <td>${c.address}</td>
        <td>${c.website}</td>
        <td>${c.created ? localTimeString(c.created) : ''}</td>
        <td>${c.updated ? localTimeString(c.updated) : ''}</td>
        <td class="action-cell">
          <button class="action-btn" data-idx="${idx}" data-id="${c.id}">Action</button>
          <button class="edit-company-btn" data-idx="${idx}" data-id="${c.id}" style="display:none; margin-left:6px; background:#e74c3c;color:#fff;border:none;">Edit</button>
        </td>
      </tr>
    `;
    if (expandedId == c.id) {
      html += `
      <tr class="expand-row always-show" id="expand-row-${idx}" style="background:#f8fafd;">
        <td colspan="6" style="padding:0;">
          <div style="padding:8px 0 8px 0;">
            <table class="key-people-nested-table" data-idx="${idx}" style="width:98%; margin:0 auto 8px auto; font-size:13px; background:#fff; border:1px solid #e0e0e0; border-radius:6px;">
              <thead style="background:#f3f6fa;">
                <tr>
                  <th style="padding:4px 8px;">Name</th>
                  <th style="padding:4px 8px;">Position</th>
                  <th style="padding:4px 8px;">Email</th>
                  <th style="padding:4px 8px;">Tel</th>
                  <th style="padding:4px 8px;">Brand</th>
                  <th style="padding:4px 8px;">Action</th>
                </tr>
                <tr>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-col="name" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-col="position" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-col="email" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-col="tel" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-col="brand" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th></th>
                </tr>
              </thead>
              <tbody class="keypeople-tbody" id="keypeople-tbody-${idx}">
                ${(() => {
                  const keyPeople = Array.isArray(c.keyPeople) ? c.keyPeople : [];
                  return keyPeople.map((kp, origKpIdx) => {
                    return `<tr class="keyperson-row" data-idx="${idx}" data-kpidx="${origKpIdx}">
                      <td style=\"padding:3px 8px;\">${kp.name}</td>
                      <td style=\"padding:3px 8px;\">${kp.position}</td>
                      <td style=\"padding:3px 8px;\">${kp.email}</td>
                      <td style=\"padding:3px 8px;\">${kp.tel}</td>
                      <td style=\"padding:3px 8px;\">${kp.brand}</td>
                      <td style=\"padding:3px 8px; position:relative;\">
                        <button class=\"edit-keyperson-btn\" data-idx=\"${idx}\" data-kpidx=\"${origKpIdx}\" data-id=\"${c.id}\" style=\"display:none; font-size:12px; padding:2px 8px;\">Edit</button>
                      </td>
                    </tr>`;
                  }).join('');
                })()}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
      `;
    }
  });
  $('#search-results').html(html);

  // Show edit button on hover for company row
  $('#search-results').off('mouseenter mouseleave', '.company-row');
  $('#search-results').on('mouseenter', '.company-row', function() {
    $(this).find('.edit-company-btn').show();
  });
  $('#search-results').on('mouseleave', '.company-row', function() {
    $(this).find('.edit-company-btn').hide();
  });

  // Show edit button on hover for key people row
  $('#search-results').off('mouseenter mouseleave', '.keyperson-row');
  $('#search-results').on('mouseenter', '.keyperson-row', function() {
    $(this).find('.edit-keyperson-btn').show();
  });
  $('#search-results').on('mouseleave', '.keyperson-row', function() {
    $(this).find('.edit-keyperson-btn').hide();
  });

  // Company row click: expand/collapse key people
  $('#search-results').off('click', '.company-row');
  $('#search-results').on('click', '.company-row', function(e) {
    // Prevent triggering when clicking the edit button
    if ($(e.target).hasClass('edit-company-btn')) return;
    const id = $(this).data('id');
    if (window.expandedCompanyId == id) {
      window.expandedCompanyId = null;
    } else {
      window.expandedCompanyId = id;
    }
    renderSearchResultsWithKeyPeople(list);
  });
}

// Key people column filter handler
$('#right-frame').off('input', '.keypeople-filter-input');
$('#right-frame').on('input', '.keypeople-filter-input', function() {
  const idx = $(this).data('idx');
  // Gather all filter values for this company
  const filters = {};
  $(`.keypeople-filter-input[data-idx='${idx}']`).each(function() {
    const col = $(this).data('col');
    filters[col] = $(this).val().toLowerCase();
  });
  const c = customers[idx];
  const keyPeople = Array.isArray(c.keyPeople) ? c.keyPeople : [];
  const filtered = keyPeople
    .map((kp, origKpIdx) => ({ ...kp, _origKpIdx: origKpIdx }))
    .filter(kp =>
      (!filters.name || (kp.name || '').toLowerCase().includes(filters.name)) &&
      (!filters.position || (kp.position || '').toLowerCase().includes(filters.position)) &&
      (!filters.email || (kp.email || '').toLowerCase().includes(filters.email)) &&
      (!filters.tel || (kp.tel || '').toLowerCase().includes(filters.tel)) &&
      (!filters.brand || (kp.brand || '').toLowerCase().includes(filters.brand))
    );
  const tbody = filtered.map((kp) => `
    <tr>
      <td style="padding:3px 8px;">${kp.name}</td>
      <td style="padding:3px 8px;">${kp.position}</td>
      <td style="padding:3px 8px;">${kp.email}</td>
      <td style="padding:3px 8px;">${kp.tel}</td>
      <td style="padding:3px 8px;">${kp.brand}</td>
      <td style="padding:3px 8px;"><button class="edit-keyperson-btn" data-idx="${idx}" data-kpidx="${kp._origKpIdx}" data-id="${c.id}" style="font-size:12px; padding:2px 8px;">Edit</button></td>
    </tr>
  `).join('');
  $(`#keypeople-tbody-${idx}`).html(tbody);
});

// Expand/Collapse logic only
$('#right-frame').off('click', '.expand-company-btn');
$('#right-frame').on('click', '.expand-company-btn', function() {
  const idx = $(this).data('idx');
  $(`.expand-row`).hide();
  $(`#expand-row-${idx}`).toggle();
});

// Edit company details only (Step 1)
$('#right-frame').off('click', '.edit-company-btn');
$('#right-frame').on('click', '.edit-company-btn', function() {
  const idx = $(this).data('idx');
  const cust = customers[idx];
  currentCustomer = cust;
  editStep1Data = {
    company: cust.company,
    address: cust.address,
    website: cust.website,
    domains: Array.isArray(cust.domains) ? cust.domains : (typeof cust.domains === 'string' ? cust.domains.split(',') : []),
  };
  editStep2Data = (cust.keyPeople && cust.keyPeople.length > 0)
    ? { keyPeople: cust.keyPeople.map(kp => ({ ...kp })) }
    : { keyPeople: [{ name: '', position: '', email: '', tel: '', brand: '' }] };
  showEditCustomerStep1();
});

function handleEditCustomer() {
  const id = $(this).data('id');
  const cust = customers.find(c => c.id == id);
  currentCustomer = cust;
  // Save initial data for editing
  editStep1Data = {
    company: cust.company,
    address: cust.address,
    website: cust.website,
    domains: Array.isArray(cust.domains) ? cust.domains : (typeof cust.domains === 'string' ? cust.domains.split(',') : []),
  };
  editStep2Data = (cust.keyPeople && cust.keyPeople.length > 0)
    ? { keyPeople: cust.keyPeople.map(kp => ({ ...kp })) }
    : { keyPeople: [{ name: '', position: '', email: '', tel: '', brand: '' }] };
  showEditCustomerStep1();
}

function showEditCustomerStep1() {
  let domainInputs = editStep1Data.domains.map((domain, idx, arr) => `
    <div class="domain-item">
      <input type="text" class="edit-domain-input" value="${domain}">
      <button type="button" class="${idx === arr.length - 1 ? 'add-domain' : 'remove-domain'}">
        ${idx === arr.length - 1 ? '+' : '-'}
      </button>
    </div>
  `).join('');
  $('#right-frame').html(`
    <h2>Edit Customer - Step 1</h2>
    <label>Company Name:<br><input type="text" id="edit-company" value="${editStep1Data.company}"></label><br>
    <label>Address:<br><input type="text" id="edit-address" value="${editStep1Data.address}"></label><br>
    <label>Website:<br><input type="text" id="edit-website" value="${editStep1Data.website}"></label><br>
    <label>Domains:<br>
      <div class="domain-list" id="edit-domain-list">
        ${domainInputs}
      </div>
    </label><br>
    <button id="update-edit-step1" disabled style="opacity:0.5;cursor:not-allowed;">Update</button>
  `);
  updateEditDomainButtons();

  function isStep1Changed() {
    if (!currentCustomer) return false;
    const orig = currentCustomer;
    const curr = {
      company: $('#edit-company').val().trim(),
      address: $('#edit-address').val().trim(),
      website: $('#edit-website').val().trim(),
      domains: $('#edit-domain-list .edit-domain-input').map(function() { return $(this).val().trim(); }).get().filter(Boolean)
    };
    const domainsEqual = Array.isArray(orig.domains) ?
      JSON.stringify(orig.domains) === JSON.stringify(curr.domains) :
      (typeof orig.domains === 'string' ? orig.domains.split(',').join(',') === curr.domains.join(',') : false);
    return !(
      orig.company === curr.company &&
      orig.address === curr.address &&
      orig.website === curr.website &&
      domainsEqual
    );
  }

  $('#right-frame').off('input change', '#edit-company, #edit-address, #edit-website, .edit-domain-input');
  $('#right-frame').on('input change', '#edit-company, #edit-address, #edit-website, .edit-domain-input', function() {
    const changed = isStep1Changed();
    const btn = $('#update-edit-step1');
    if (changed) {
      btn.prop('disabled', false).css({opacity: 1, cursor: 'pointer'});
    } else {
      btn.prop('disabled', true).css({opacity: 0.5, cursor: 'not-allowed'});
    }
  });

  $('#right-frame').off('click', '#update-edit-step1');
  $('#right-frame').on('click', '#update-edit-step1', function() {
    if (!isStep1Changed()) {
      showCustomPopup('No changes detected.', true);
      return;
    }
    // Save edits
    editStep1Data.company = $('#edit-company').val().trim();
    editStep1Data.address = $('#edit-address').val().trim();
    editStep1Data.website = $('#edit-website').val().trim();
    editStep1Data.domains = $('#edit-domain-list .edit-domain-input').map(function() { return $(this).val().trim(); }).get().filter(Boolean);
    // Prepare customer object for update (only step 1 fields)
    const id = currentCustomer.id;
    const customer = {
      company: editStep1Data.company,
      address: editStep1Data.address,
      website: editStep1Data.website,
      domains: editStep1Data.domains,
      // Do not send keyPeople, so backend will not touch them
    };
    // Send update to backend
    $.ajax({
      url: 'http://localhost:5000/customers/' + id,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(customer),
      success: function() {
        fetchCustomers(function() {
          showModify();
          showCustomPopup('Record updated!');
        });
      }
    });
  });
}

function showEditCustomerStep2() {
  console.log('showEditCustomerStep2 called', editStep2Data);
  console.log('DEBUG at start of showEditCustomerStep2, editStep1Data:', editStep1Data);
  // Use array for key people
  let keyPeople = Array.isArray(editStep2Data.keyPeople) && editStep2Data.keyPeople.length > 0
    ? editStep2Data.keyPeople
    : [editStep2Data && Object.keys(editStep2Data).length > 0 ? editStep2Data : { name: '', position: '', email: '', tel: '', brand: '' }];

  // If only one key person and we are in "edit single key person" mode, hide the Previous button
  const hidePrev = keyPeople.length === 1 && window.editSingleKeyPersonMode;

  function renderKeyPeopleForms() {
    return keyPeople.map((kp, idx) => {
      let emailPrefix = kp.email && kp.email.includes('@') ? kp.email.split('@')[0] : '';
      let emailDomain = kp.email && kp.email.includes('@') ? kp.email.split('@')[1] : (editStep1Data.domains && editStep1Data.domains[0] ? editStep1Data.domains[0] : '');
      let domainSelect = '';
      if (editStep1Data.domains && editStep1Data.domains.length > 1) {
        domainSelect = `<select class="edit-keyperson-email-domain">${editStep1Data.domains.map(d => `<option value="${d}"${d===emailDomain?' selected':''}>${d}</option>`).join('')}</select>`;
      } else {
        domainSelect = `<input type="text" value="${editStep1Data.domains && editStep1Data.domains[0] ? editStep1Data.domains[0] : ''}" disabled class="edit-keyperson-email-domain">`;
      }
      // Always show the same Remove button for all key people if more than one
      const removeBtn = keyPeople.length > 1
        ? `<button type="button" class="remove-edit-keyperson">Remove</button>`
        : `<button type="button" class="remove-edit-keyperson" disabled>Remove</button>`;
      return `
        <div class="edit-keyperson-form" data-index="${idx}" style="border:1px solid #ccc; border-radius:8px; padding:18px 18px 10px 18px; margin-bottom:22px; background:#fafbfc; box-shadow:0 2px 8px #eee;">
          <div style="font-weight:bold; font-size:18px; margin-bottom:10px; color:#2a3b4c;">Key Person ${idx+1}</div>
          <div style="display:flex; flex-wrap:wrap; gap:18px 3%;">
            <div style="flex:1 1 45%; min-width:220px;"><label>Name:<br><input type="text" class="edit-person-name" value="${kp.name || ''}"></label></div>
            <div style="flex:1 1 45%; min-width:220px;"><label>Position:<br><input type="text" class="edit-person-position" value="${kp.position || ''}"></label></div>
            <div style="flex:1 1 45%; min-width:220px;"><label>Email Prefix:<br><input type="text" class="edit-email-prefix" placeholder="prefix" value="${emailPrefix}"></label></div>
            <div style="flex:1 1 45%; min-width:220px;"><label>Email Domain:<br>${domainSelect}</label></div>
            <div style="flex:1 1 45%; min-width:220px;"><label>Tel:<br><input type="text" class="edit-person-tel" value="${kp.tel || ''}"></label></div>
            <div style="flex:1 1 45%; min-width:220px;"><label>Brand:<br><input type="text" class="edit-person-brand" value="${kp.brand || ''}"></label></div>
          </div>
          <div style="margin-top:10px; text-align:right;">
            ${removeBtn}
          </div>
        </div>
      `;
    }).join('');
  }

  // Compare current form data to original key person data
  function isEditChanged() {
    if (!currentCustomer) return false;
    // Only compare the first key person
    const origKP = Array.isArray(currentCustomer.keyPeople) ? currentCustomer.keyPeople : [];
    const currKP = Array.isArray(editStep2Data.keyPeople) ? editStep2Data.keyPeople : [];
    if (origKP.length === 0 || currKP.length === 0) return true;
    // Find the original key person by email (or index if not found)
    let origIdx = 0;
    if (window.editSingleKeyPersonMode && window.editSingleKeyPersonIdx !== undefined) {
      origIdx = window.editSingleKeyPersonIdx;
    }
    const orig = origKP[origIdx] || {};
    const curr = currKP[0];
    return !(
      orig.name === curr.name &&
      orig.position === curr.position &&
      orig.email === curr.email &&
      orig.tel === curr.tel &&
      orig.brand === curr.brand
    );
  }

  // Render the form
  $('#right-frame').html(`
    <h2>Edit Customer - Step 2</h2>
    <div id="edit-keypeople-list">
      ${renderKeyPeopleForms()}
    </div>
    <div class="slide-nav">
      ${hidePrev ? '' : '<button id="prev-edit-step2">Previous</button>'}
      <button id="update-customer" disabled style="opacity:0.5;cursor:not-allowed;">Update</button>
    </div>
  `);

  // Set update button state
  function updateButtonState() {
    const changed = isEditChanged();
    const btn = $('#update-customer');
    if (changed) {
      btn.prop('disabled', false).css({opacity: 1, cursor: 'pointer'});
    } else {
      btn.prop('disabled', true).css({opacity: 0.5, cursor: 'not-allowed'});
    }
  }
  updateButtonState();

  // Listen for changes to enable/disable update button
  $('#right-frame').off('input change', '.edit-keyperson-form input, .edit-keyperson-form select');
  $('#right-frame').on('input change', '.edit-keyperson-form input, .edit-keyperson-form select', function() {
    // Update editStep2Data.keyPeople from form
    const forms = $('.edit-keyperson-form');
    editStep2Data.keyPeople = [];
    forms.each(function() {
      const $form = $(this);
      const name = ($form.find('.edit-person-name').val() || '').trim();
      const position = ($form.find('.edit-person-position').val() || '').trim();
      const emailPrefix = ($form.find('.edit-email-prefix').val() || '').trim();
      let domain = '';
      if ($form.find('.edit-keyperson-email-domain').is('select')) {
        domain = ($form.find('.edit-keyperson-email-domain').val() || '').trim();
      } else {
        domain = ($form.find('.edit-keyperson-email-domain').val() || '').trim();
      }
      const email = emailPrefix && domain ? `${emailPrefix}@${domain}` : '';
      const tel = ($form.find('.edit-person-tel').val() || '').trim();
      const brand = ($form.find('.edit-person-brand').val() || '').trim();
      editStep2Data.keyPeople.push({ name, position, email, tel, brand });
    });
    updateButtonState();
  });

  // Update button click logic
  $('#right-frame').off('click', '#update-customer');
  $('#right-frame').on('click', '#update-customer', function() {
    if (!isEditChanged()) {
      showCustomPopup('No changes detected.', true);
      return;
    }
    // Validate all key people
    let problems = [];
    const keyPeople = editStep2Data.keyPeople;
    keyPeople.forEach(function(kp) {
      if (!kp.name) problems.push('Name is required');
      if (!kp.position) problems.push('Position is required');
      if (!kp.email) problems.push('Email is required');
      if (!kp.tel) problems.push('Tel is required');
      if (!kp.brand) problems.push('Brand is required');
    });
    if (problems.length > 0) {
      showCustomPopup('Please fix the following:\n' + problems.join('\n'), true);
      return;
    }
    const now = new Date().toISOString().slice(0,16).replace('T',' ');
    const id = currentCustomer.id;
    const customer = {
      company: editStep1Data.company,
      address: editStep1Data.address,
      website: editStep1Data.website,
      domains: editStep1Data.domains,
      updated: now,
      keyPeople: keyPeople
    };
    updateCustomer(id, customer, function() {
      fetchCustomers(function() {
        showCustomPopup('Customer updated!');
        showCustomerList(true, 'Customer updated!');
      });
    });
  });
}

// Key Person Edit: Go to Edit Step 2 for that person, no Previous button, update logic as described
$('#right-frame').off('click', '.edit-keyperson-btn');
$('#right-frame').on('click', '.edit-keyperson-btn', function() {
  const companyId = $(this).data('id');
  const kpIdx = $(this).data('kpidx');
  const cust = customers.find(c => c.id == companyId);
  currentCustomer = cust;
  editStep1Data = {
    company: cust.company,
    address: cust.address,
    website: cust.website,
    domains: Array.isArray(cust.domains) ? cust.domains : (typeof cust.domains === 'string' ? cust.domains.split(',') : []),
  };
  const kp = (cust.keyPeople && cust.keyPeople[kpIdx]) ? cust.keyPeople[kpIdx] : { name: '', position: '', email: '', tel: '', brand: '' };
  editStep2Data = { keyPeople: [ { ...kp } ] };
  window.editSingleKeyPersonMode = true;
  window.editSingleKeyPersonIdx = kpIdx;
  showEditCustomerStep2();
});

// When leaving Step 2, always reset the flag
$('#right-frame').off('click', '#prev-edit-step2');
$('#right-frame').on('click', '#prev-edit-step2', function() {
  window.editSingleKeyPersonMode = false;
  window.editSingleKeyPersonIdx = undefined;
  showEditCustomerStep1();
});

// Add this function to clean up records with undefined 'updated' field
function removeCustomersWithUndefinedUpdated() {
  customers = customers.filter(c => typeof c.updated !== 'undefined' && c.updated !== null && c.updated !== 'undefined');
  saveCustomersToStorage();
}

function addEditDomainField() {
  $('#edit-domain-list').append(`
    <div class="domain-item">
      <input type="text" class="edit-domain-input" value="">
      <button type="button" class="add-domain">+</button>
    </div>
  `);
  updateEditDomainButtons();
}

function removeEditDomainField() {
  $(this).closest('.domain-item').remove();
  updateEditDomainButtons();
}

function updateEditDomainButtons() {
  const items = $('#edit-domain-list .domain-item');
  items.each(function(index) {
    const btn = $(this).find('button');
    if (index === items.length - 1) {
      btn.text('+').removeClass('remove-domain').addClass('add-domain');
    } else {
      btn.text('-').removeClass('add-domain').addClass('remove-domain');
    }
  });
}

// Add Key Person handler for Edit Step 2
$('#right-frame').on('click', '#add-edit-keyperson', function() {
  if (!Array.isArray(editStep2Data.keyPeople)) editStep2Data.keyPeople = [];
  editStep2Data.keyPeople.push({ name: '', position: '', email: '', tel: '', brand: '' });
  showEditCustomerStep2();
});
// Remove Key Person handler for Edit Step 2 with confirmation
$('#right-frame').off('click', '.remove-edit-keyperson');
$('#right-frame').on('click', '.remove-edit-keyperson', function() {
  const idx = $(this).closest('.edit-keyperson-form').data('index');
  if (Array.isArray(editStep2Data.keyPeople) && editStep2Data.keyPeople.length > 1) {
    if (confirm('Are you sure you want to remove this key person?')) {
      editStep2Data.keyPeople.splice(idx, 1);
      showEditCustomerStep2();
    }
  }
});