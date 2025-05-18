// Remove LocalStorage and in-memory array logic
// Use AJAX to communicate with Flask backend
let customers = [];

// Add this at the beginning of the file
function checkUserPermission(callback) {
  $.get('/check_permission', function(response) {
    callback(response.level);
  }).fail(function() {
    callback(0);
  });
}

// Function to check if user has database permission (level 3)
function checkDatabasePermission(callback) {
  checkUserPermission(function(level) {
    const hasPermission = level >= 3;
    if (callback) callback(hasPermission);
  });
}

// A default definition to avoid ReferenceError
function handleSubmitSlide2() {}
  let currentCustomer = null;
  let slide1Data = {};
  let slide2Data = {};
let editStep1Data = {};
let editStep2Data = {};

function fetchCustomers(callback) {
  $.ajax({
    url: '/customers',
    type: 'GET',
    success: function(data) {
      customers = data;
      console.log('[DEBUG] Fetched customers:', customers.length);
      if (callback) callback();
    },
    error: function(xhr, status, error) {
      console.error('[ERROR] Failed to fetch customers:', status, error);
      showCustomPopup('Failed to load customers. Please try again.', true);
      if (callback) callback([]);
    }
  });
}

function createCustomer(customer, callback) {
  $('#right-frame').append(`
    <div id="create-loading-indicator" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <p>Creating customer... <span class="spinner" style="display: inline-block; width: 16px; height: 16px; border: 3px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #3498db; animation: spin 1s linear infinite;"></span></p>
      </div>
    </div>
  `);
  
  $.ajax({
    url: '/customers',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(customer),
    success: function(response) {
      $('#create-loading-indicator').remove();
      // Show email status message if present
      if (response && response.email_message) {
        showCustomPopup(response.email_message, response.email_status !== 'success');
      }
      
      // Explicitly fetch customers again to ensure we have the latest data
      fetchCustomers(function() {
        console.log('[DEBUG] Customers refreshed after create:', customers.length);
        if (callback) callback();
      });
    },
    error: function(xhr, status, error) {
      $('#create-loading-indicator').remove();
      console.error('[ERROR] Failed to create customer:', status, error, xhr.responseText);
      let errorMsg = 'Failed to create customer.';
      
      // Try to extract more detailed error message from response if possible
      try {
        const response = JSON.parse(xhr.responseText);
        if (response && response.error) {
          errorMsg += ' ' + response.error;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
      
      showCustomPopup(errorMsg, true);
      if (callback) callback(false);
    }
  });
}

function updateCustomer(id, customer, callback) {
  $('#right-frame').append(`
    <div id="update-loading-indicator" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <p>Updating customer... <span class="spinner" style="display: inline-block; width: 16px; height: 16px; border: 3px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #3498db; animation: spin 1s linear infinite;"></span></p>
      </div>
    </div>
  `);
  
  if (!id) {
    console.error('[ERROR] No customer ID provided for update');
    $('#update-loading-indicator').remove();
    showCustomPopup('Failed to update: Missing customer ID', true);
    if (callback) callback(false);
    return;
  }
  
  console.log('[DEBUG] Updating customer ID:', id);
  
  $.ajax({
    url: '/customers/' + id,
    type: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(customer),
    success: function() { 
      $('#update-loading-indicator').remove();
      // Explicitly fetch customers again to ensure we have the latest data
      fetchCustomers(function() {
        console.log('[DEBUG] Customers refreshed after update:', customers.length);
        if (callback) callback(true);
      });
    },
    error: function(xhr, status, error) {
      $('#update-loading-indicator').remove();
      console.error('[ERROR] Failed to update customer:', status, error, xhr.responseText);
      let errorMsg = 'Failed to update customer.';
      
      // Try to extract more detailed error message from response if possible
      try {
        const response = JSON.parse(xhr.responseText);
        if (response && response.error) {
          errorMsg += ' ' + response.error;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
      
      showCustomPopup(errorMsg, true);
      if (callback) callback(false);
    }
  });
}

$(function() {
  $('#right-frame').empty();
  console.log('[INFO] Document ready, initializing app...');
  
  // Add network status monitoring
  window.addEventListener('online', function() {
    console.log('[INFO] Network connection restored');
    showCustomPopup('Network connection restored. Refreshing data...', false);
    fetchCustomers(function() {
      console.log('[INFO] Customers refreshed after network reconnection');
    });
  });
  
  window.addEventListener('offline', function() {
    console.log('[WARNING] Network connection lost');
    showCustomPopup('Network connection lost. Some features may not work properly.', true);
  });
  
  // On load, fetch customers from backend
  fetchCustomers(function() {
    console.log('[INFO] Initial customer data loaded:', customers.length, 'records');
  });

  // Left frame navigation
  $('#btn-customer').click(function() {
    $('#customer-nested').toggle();
  });
  $('#btn-development').click(function() {
    $('#right-frame').html('<h2>Development Section</h2><p>Coming soon...</p>');
  });
  $('#btn-create').click(function() {
    slide1Data = {};
    slide2Data = {};
    showCreateSlide1();
  });
  $('#btn-modify').click(function() {
    console.log('[INFO] Modify button clicked, showing modify screen');
    showModify();
  });

    // Delegated events for dynamic content
    $('#right-frame').on('click', '#next-slide1', handleNextSlide1);
    $('#right-frame').on('click', '#prev-slide2', function() {
      // Do not reset slide1Data here; just show the form with current data
      showCreateSlide1();
    });
    $('#right-frame').on('click', '#submit-slide2', handleSubmitSlide2);
    $('#right-frame').on('click', '.add-domain', addDomainField);
    $('#right-frame').on('click', '.remove-domain', removeDomainField);
    $('#right-frame').on('input', '.website-input', validateWebsite);
    $('#right-frame').on('input', '.search-input', handleSearchInput);
    $('#right-frame').on('click', '.edit-btn', handleEditCustomer);

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

  // Quotation menu logic
  $('#btn-quotation').on('click', function() {
    $('#quotation-nested').toggle();
  });
  $('#btn-quotation-create').on('click', function() {
    showQuotationCreateForm();
  });
});
  
  // --- Create Customer Flow ---
  
  function showCreateSlide1() {
  // Use existing slide1Data or default
  const company = slide1Data.company || '';
  const address = slide1Data.address || '';
  const website = slide1Data.website || '';
  const domains = slide1Data.domains && slide1Data.domains.length > 0 ? slide1Data.domains : [''];
  // Fetch Customer Type options from backend
  $.get('/option_databases', function(databases) {
    const customerTypeDb = databases.find(db => db.name.toLowerCase() === 'customer type');
    let customerTypeOptions = '';
    if (customerTypeDb) {
      customerTypeOptions = customerTypeDb.fields.map(opt => `<option value="${opt.value}"${slide1Data.customerType === opt.value ? ' selected' : ''}>${opt.value}</option>`).join('');
    }
    $('#right-frame').html(`
      <div style=\"position:relative;\"><button id=\"dummy-fill-btn-step1\" style=\"position:absolute;top:18px;right:32px;z-index:1000;background:#f39c12;color:#fff;border:none;border-radius:6px;padding:6px 18px;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;\">Dummy Fill</button></div>
      <h2>Create Customer - Step 1</h2>
      <div>
      <label>Company Name:<br><input type=\"text\" id=\"company-name\" value=\"${company}\"></label><br>
      <label>Address:<br><input type=\"text\" id=\"address\" value=\"${address}\"></label><br>
        <label>Website:<br>
        <input type=\"text\" class=\"website-input\" id=\"website\" value=\"${website}\">
          <span class=\"error\" id=\"website-error\"></span>
        </label><br>
        <div class=\"domain-list\" id=\"domain-list\">
          <label>Domain(s):</label>
        ${domains.map((d, i) => `
          <div class=\"domain-item\">
            <input type=\"text\" class=\"domain-input\" value=\"${d}\">
            <button type=\"button\" class=\"${i === domains.length - 1 ? 'add-domain' : 'remove-domain'}\">${i === domains.length - 1 ? '+' : '-'}</button>
          </div>
        `).join('')}
      </div>
      <div id=\"customer-type-row\">
        <label>Customer Type:<br>
          <select id=\"customer-type-select\">
            <option value=\"\">-- Select --</option>
            ${customerTypeOptions}
          </select>
        </label>
      </div>
      </div>
      <div class=\"slide-nav\">
        <button id=\"next-slide1\">Next</button>
      </div>
    `);
    updateDomainButtons();
    // Restore previous selection if any
    if (slide1Data.customerType) {
      $('#customer-type-select').val(slide1Data.customerType);
    }
    // Save selection on change
    $('#customer-type-select').off('change').on('change', function() {
      slide1Data.customerType = $(this).val();
    });
    // Dummy fill handler for Step 1 (must be after HTML is rendered)
    $('#dummy-fill-btn-step1').off('click').on('click', function() {
      const companies = ['Acme Corp', 'Globex Inc', 'Umbrella LLC', 'Wayne Enterprises', 'Stark Industries'];
      const addresses = ['123 Main St', '456 Elm Ave', '789 Oak Blvd', '101 Maple Dr', '202 Pine Ln'];
      const websites = ['acme.com', 'globex.com', 'umbrella.com', 'wayne.com', 'stark.com'];
      const idx = Math.floor(Math.random() * companies.length);
      const company = '(dummy) ' + companies[idx];
      const address = addresses[idx];
      const website = websites[idx];
      const allDomains = ['acme.com', 'globex.com', 'umbrella.com', 'wayne.com', 'stark.com', 'example.com'];
      const domainCount = 1 + Math.floor(Math.random() * 2);
      const domains = [];
      while (domains.length < domainCount) {
        const d = allDomains[Math.floor(Math.random() * allDomains.length)];
        if (!domains.includes(d)) domains.push(d);
      }
      $('#company-name').val(company);
      $('#address').val(address);
      $('#website').val(website);
      $('#domain-list .domain-item').slice(1).remove();
      $('#domain-list .domain-item').first().find('.domain-input').val(domains[0]);
      for (let i = 1; i < domains.length; i++) {
        addDomainField();
        $('#domain-list .domain-item').last().find('.domain-input').val(domains[i]);
      }
      updateDomainButtons();
      const $typeSelect = $('#customer-type-select');
      const opts = $typeSelect.find('option').not('[value=""]');
      if (opts.length > 0) {
        const randType = opts.eq(Math.floor(Math.random() * opts.length)).val();
        $typeSelect.val(randType).trigger('change');
      }
      // Reset all warning highlights
      $('#company-name, #address, #website, .domain-input, #customer-type-select').removeClass('highlight-error');
    });
  });
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
    const customerType = $('#customer-type-select').val();
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
    if (!customerType) {
      problems.push('Customer Type is required');
      $('#customer-type-select').addClass('highlight-error');
    } else {
      $('#customer-type-select').removeClass('highlight-error');
    }
    // Check for duplicate domains in the database
    const allExistingDomains = customers.flatMap(c => Array.isArray(c.domains) ? c.domains : (typeof c.domains === 'string' ? c.domains.split(',').map(d => d.trim()) : []));
    const duplicateDomains = domains.filter(d => allExistingDomains.includes(d));
    if (duplicateDomains.length > 0) {
      problems.push('Domain(s) already exist in the database: ' + duplicateDomains.join(', '));
      $('.domain-input').each(function() {
        if (duplicateDomains.includes($(this).val().trim())) {
          $(this).addClass('highlight-error');
        }
      });
    }
    if (problems.length > 0) {
      showCustomPopup('Please fix the following:\n' + problems.join('\n'), true);
      return false; // Prevent going to page 2
    }
    slide1Data = { company, address, website, domains, customerType };
    // Do not reset slide2Data.keyPeople here; preserve it
    showCreateSlide2();
  }
  
  function showCreateSlide2() {
    // Use existing slide2Data or default: array of key people
    let keyPeople = Array.isArray(slide2Data.keyPeople) && slide2Data.keyPeople.length > 0
      ? slide2Data.keyPeople
      : [{ name: '', position: '', email: '', tel: '', brand: '' }];

    // Fetch Brand options from backend
    $.get('/option_databases', function(databases) {
      const brandDb = databases.find(db => db.name.toLowerCase() === 'brand');
      let brandOptions = '';
      if (brandDb) {
        brandOptions = brandDb.fields.map(opt => `<option value="${opt.value}">${opt.value}</option>`).join('');
      }
      function renderKeyPeopleForms() {
        let isAddUserMode = !!window.addUserCompanyId;
        return keyPeople.map((kp, idx) => {
          let emailPrefix = kp.email && kp.email.includes('@') ? kp.email.split('@')[0] : '';
          let emailDomain = kp.email && kp.email.includes('@') ? kp.email.split('@')[1] : (slide1Data.domains && slide1Data.domains[0] ? slide1Data.domains[0] : '');
          let domainSelect = '';
          if (slide1Data.domains.length > 1) {
            domainSelect = `<select class="keyperson-email-domain">${slide1Data.domains.map(d => `<option value="${d}"${d===emailDomain?' selected':''}>${d}</option>`).join('')}</select>`;
          } else {
            domainSelect = `<input type="text" value="${slide1Data.domains[0] || ''}" disabled class="keyperson-email-domain">`;
          }
          // Remove 'Remove' button in add user mode
          let removeBtn = (!isAddUserMode && keyPeople.length > 1)
            ? `<button type="button" class="remove-keyperson" ${keyPeople.length === 1 ? 'disabled' : ''}>Remove</button>`
            : '';
          // Brand field as dropdown or multi-select
          let brandField = '';
          if (brandDb) {
            if (isMulti) {
              // Multi-select
              const selected = Array.isArray(kp.brand)
                ? kp.brand
                : (typeof kp.brand === 'string' && kp.brand.includes(','))
                  ? kp.brand.split(',').map(s => s.trim())
                  : (kp.brand ? [kp.brand] : []);
              brandField = `<select class=\"person-brand\" multiple style=\"height:120px;\">${brandDb.fields.map(opt => `<option value=\"${opt.value}\"${selected.includes(opt.value) ? ' selected' : ''}>${opt.value}</option>`).join('')}</select>`;
            } else {
              // Single-select
              brandField = `<select class=\"person-brand\" style=\"height:120px;\"><option value=\"\">-- Select --</option>${brandDb.fields.map(opt => `<option value=\"${opt.value}\"${kp.brand === opt.value ? ' selected' : ''}>${opt.value}</option>`).join('')}</select>`;
            }
          } else {
            // Fallback to text input if no brandDb
            brandField = `<input type="text" class="person-brand" value="${kp.brand || ''}">`;
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
              <label>Brand:<br>${brandField}</label><br>
              ${removeBtn}
            </div>
          `;
        }).join('');
      }

      let isAddUserMode = !!window.addUserCompanyId;
      // Company info box
      const companyInfoBox = `
        <div class="company-info-box" style="background:#f6fafd; border:1px solid #d0e0f0; border-radius:8px; padding:12px 18px; margin-bottom:18px;">
          <div><b>Company:</b> ${slide1Data.company || ''}</div>
          <div><b>Address:</b> ${slide1Data.address || ''}</div>
          <div><b>Website:</b> ${slide1Data.website || ''}</div>
          <div><b>Domains:</b> ${(slide1Data.domains || []).join(', ')}</div>
        </div>
      `;
      // Back button HTML for add user mode
      const backBtnHtml = isAddUserMode ? '<button id="back-to-modify" style="margin-bottom:12px;background:#eee;border:1px solid #bbb;border-radius:4px;padding:4px 16px;font-size:14px;">Back</button>' : '';
      $('#right-frame').html(`
        ${backBtnHtml}
        <h2>Create Customer - Step 2</h2>
        ${companyInfoBox}
        <div style="margin-bottom:18px;"><button id=\"dummy-fill-btn\" style=\"background:#f39c12;color:#fff;border:none;border-radius:6px;padding:6px 18px;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;\">Dummy Fill</button></div>
        <div id="keypeople-list">
          ${renderKeyPeopleForms()}
        </div>
        <div class="slide-nav">
          ${!isAddUserMode ? '<button type="button" id="add-keyperson">Add Key Person</button>' : ''}
          ${!isAddUserMode ? '<button id="prev-slide2">Previous</button>' : ''}
          <button id="submit-slide2">${isAddUserMode ? 'Update' : 'Submit'}</button>
        </div>
      `);
      // Dummy fill handler
      $('#dummy-fill-btn').off('click').on('click', function() {
        const randomNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
        const randomPositions = ['Manager', 'Engineer', 'Director', 'Analyst', 'Consultant'];
        const randomTels = ['12345678', '87654321', '5551234', '99988877'];
        const randomDomains = (slide1Data.domains && slide1Data.domains.length > 0) ? slide1Data.domains : ['example.com'];
        $('.keyperson-form').each(function(i) {
          const $form = $(this);
          $form.find('.person-name').val('(dummy) ' + randomNames[Math.floor(Math.random()*randomNames.length)] + ' ' + (Math.floor(Math.random()*100)));
          $form.find('.person-position').val(randomPositions[Math.floor(Math.random()*randomPositions.length)]);
          $form.find('.email-prefix').val('user' + Math.floor(Math.random()*1000));
          $form.find('.keyperson-email-domain').val(randomDomains[Math.floor(Math.random()*randomDomains.length)]);
          $form.find('.person-tel').val(randomTels[Math.floor(Math.random()*randomTels.length)]);
          // Brand field logic
          const $brand = $form.find('.person-brand');
          if ($brand.is('select[multiple]')) {
            // Multi-select: choose at least 2 random options
            const options = $brand.find('option');
            let indices = Array.from({length: options.length}, (_, i) => i);
            indices = indices.sort(() => Math.random() - 0.5);
            const pickCount = Math.max(2, Math.floor(Math.random() * options.length));
            const selected = indices.slice(0, pickCount).map(i => options.eq(i).val());
            $brand.val(selected);
          } else if ($brand.is('select')) {
            // Single-select: pick one random option (not empty)
            const options = $brand.find('option').not('[value=""]');
            const val = options.eq(Math.floor(Math.random()*options.length)).val();
            $brand.val(val);
          } else {
            // Text input fallback
            $brand.val('BrandA');
          }
        });
        // Trigger change to update data
        $('.keyperson-form input, .keyperson-form select').trigger('input');
      });
      // Add handler for back button in add user mode
      if (isAddUserMode) {
        $('#back-to-modify').off('click').on('click', function() {
          window.addUserCompanyId = null;
          showModify();
        });
      }
      // Save key people data on input/select (move inside AJAX callback for brandDb/isMulti access)
      $('#right-frame').off('input change', '.keyperson-form input, .keyperson-form select');
      $('#right-frame').on('input change', '.keyperson-form input, .keyperson-form select', function() {
        $(this).removeClass('highlight-error');
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
          // Only treat brand as a string in the global handler
          const brand = $form.find('.person-brand').val();
          slide2Data.keyPeople.push({ name, position, email, tel, brand });
        });
      });
    });
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
    $(this).removeClass('highlight-error');
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
      // Only treat brand as a string in the global handler
      const brand = $form.find('.person-brand').val();
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
      // Only treat brand as a string in the global handler
      const brand = $form.find('.person-brand').val();
      slide2Data.keyPeople.push({ name, position, email, tel, brand });
    });
    showCreateSlide1();
  });
});

const _origHandleSubmitSlide2 = handleSubmitSlide2;
handleSubmitSlide2 = function() {
  console.log('handleSubmitSlide2 called. addUserCompanyId:', window.addUserCompanyId);
  // Fetch Brand options from backend to get brandDb and isMulti in scope
  $.get('/option_databases', function(databases) {
    const brandDb = databases.find(db => db.name.toLowerCase().includes('brand'));
    const isMulti = !!(brandDb && brandDb.is_multiselect);
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
      // Only treat brand as a string in the global handler
      const brand = $form.find('.person-brand').val();
      if (!name) {
        problems.push('Name is required');
        $form.find('.person-name').addClass('highlight-error');
      }
      if (!position) {
        problems.push('Position is required');
        $form.find('.person-position').addClass('highlight-error');
      }
      if (!emailPrefix) {
        problems.push('Email prefix is required');
        $form.find('.email-prefix').addClass('highlight-error');
      }
      if (!tel) {
        problems.push('Tel is required');
        $form.find('.person-tel').addClass('highlight-error');
      }
      if (!brand || (Array.isArray(brand) && brand.length === 0)) {
        problems.push('Brand is required');
        $form.find('.person-brand').addClass('highlight-error');
      }
      keyPeople.push({ name, position, email, tel, brand });
    });
    if (problems.length > 0) {
      showCustomPopup('Please fix the following:\n' + problems.join('\n'), true);
      return;
    }
    if (window.addUserCompanyId) {
      const id = window.addUserCompanyId;
      const cust = customers.find(c => c.id == id);
      const updatedKeyPeople = Array.isArray(cust.keyPeople) ? [...cust.keyPeople] : [];
      updatedKeyPeople.push(...keyPeople);
      const updatedCustomer = { ...cust, keyPeople: updatedKeyPeople, domains: normalizeDomains(cust.domains) };
      console.log('Submitting updateCustomer for company ID', cust.id, updatedCustomer);
      $.ajax({
        url: '/customers/' + cust.id,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedCustomer),
        success: function() {
          fetchCustomers(function() {
            window.addUserCompanyId = null;
            window.expandedCompanyId = cust.id;
            showModify();
            showCustomPopup('Key person added!');
            console.log('Key person added and UI updated.');
          });
        },
        error: function(xhr, status, error) {
          alert('Failed to update customer: ' + error);
          console.error('AJAX error:', status, error, xhr.responseText);
        }
      });
      return;
    }
    // --- Create Customer flow ---
    // Build customer object from slide1Data and keyPeople
    const customer = {
      company: slide1Data.company,
      address: slide1Data.address,
      website: slide1Data.website,
      domains: slide1Data.domains,
      customerType: slide1Data.customerType,
      keyPeople: keyPeople
    };
    createCustomer(customer, function() {
      fetchCustomers(function() {
        slide1Data = {};
        slide2Data = {};
        showModify();
        showCustomPopup('Customer created!');
      });
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
              <td>${normalizeDomains(c.domains).join('<br>')}</td>
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
    <div id="loading-indicator" style="text-align: center; padding: 20px;">
      <p>Loading customers... <span class="spinner" style="display: inline-block; width: 16px; height: 16px; border: 3px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #3498db; animation: spin 1s linear infinite;"></span></p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `);
  
  // Always fetch fresh data when showing the modify screen
  fetchCustomers(function() {
    if (!customers || customers.length === 0) {
      $('#right-frame').html(`
        <h2>Modify Customer</h2>
        <div style="padding: 20px; text-align: center;">
          <p>No customers found in the database. Please <a href="#" id="back-to-create">create a customer</a> first.</p>
        </div>
      `);
      return;
    }
    
    $('#right-frame').html(`
      <h2>Modify Customer</h2>
      <table class="table-search">
        <tr>
          <th>Company<br><input type="text" class="search-input" data-field="company"></th>
          <th>Address<br><input type="text" class="search-input" data-field="address"></th>
          <th>Website<br><input type="text" class="search-input" data-field="website"></th>
          <th>Domains<br><input type="text" class="search-input" data-field="domains"></th>
          <th>Customer Type<br><input type="text" class="search-input" data-field="customerType"></th>
          <th>Created</th>
          <th>Updated</th>
          <th>Action</th>
        </tr>
        <tbody id="search-results"></tbody>
      </table>
    `);
    renderSearchResultsWithKeyPeople(customers);
  });
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
    (!filters.website || c.website.toLowerCase().includes(filters.website)) &&
    (!filters.domains || normalizeDomains(c.domains).some(d => d.toLowerCase().includes(filters.domains))) &&
    (!filters.customerType || (c.customerType || '').toLowerCase().includes(filters.customerType))
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
  if (window.preventCompanyTableRerender) return;
  let html = '';
  const sorted = [...list].sort((a, b) => (b.updated > a.updated ? 1 : b.updated < a.updated ? -1 : 0));
  let expandedId = window.expandedCompanyId !== undefined ? window.expandedCompanyId : null;
  sorted.forEach((c, idx) => {
    const isExpanded = expandedId == c.id;
    html += `
      <tr class="company-row${isExpanded ? ' editing-row' : ''}" data-idx="${idx}" data-id="${c.id}">
        <td>${c.company}</td>
        <td>${c.address}</td>
        <td>${c.website}</td>
        <td>${normalizeDomains(c.domains).join('<br>')}</td>
        <td>${c.customerType || ''}</td>
        <td>${c.created ? localTimeString(c.created) : ''}</td>
        <td>${c.updated ? localTimeString(c.updated) : ''}</td>
        <td class="action-cell" style="position:relative;">
          <span class="action-btn-wrap" style="position:relative;">
            <button class="action-btn" data-idx="${idx}" data-id="${c.id}">Action</button>
            <div class="action-dropdown" style="display:none; position:absolute; left:0; top:32px; background:#fff; border:1px solid #ccc; border-radius:6px; box-shadow:0 2px 8px #eee; z-index:10; min-width:120px;">
              <div class="action-dropdown-item action-edit" data-id="${c.id}" style="padding:8px 16px; cursor:pointer; font-weight:bold;">✏️ Edit</div>
              <div class="action-dropdown-item action-add-user" data-id="${c.id}" style="padding:8px 16px; cursor:pointer; font-weight:bold;">➕ Add User</div>
            </div>
          </span>
          ${isExpanded ? `<button class="edit-company-btn" data-id="${c.id}" style="background:#3498db;color:#fff;border:2px solid #3498db;border-radius:4px;padding:2px 12px;font-size:14px;">Edit</button>` : ''}
        </td>
      </tr>
    `;
    if (isExpanded) {
      html += `
      <tr class="expand-row always-show" id="expand-row-${idx}" style="background:#f8fafd;">
        <td colspan="8" style="padding:0;">
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
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-id="${c.id}" data-col="name" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-id="${c.id}" data-col="position" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-id="${c.id}" data-col="email" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-id="${c.id}" data-col="tel" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th><input type="text" class="keypeople-filter-input" data-idx="${idx}" data-id="${c.id}" data-col="brand" placeholder="Filter" style="width:90%; font-size:12px; padding:2px 4px; border-radius:4px; border:1px solid #ccc;"></th>
                  <th></th>
                </tr>
              </thead>
              <tbody class="keypeople-tbody" id="keypeople-tbody-${c.id}">
                ${(() => {
                  const keyPeople = Array.isArray(c.keyPeople) ? c.keyPeople : [];
                  return keyPeople.map((kp, origKpIdx) => {
                    return `<tr class="keyperson-row" data-idx="${c.id}" data-kpidx="${origKpIdx}">
                      <td style=\"padding:3px 8px;\">${kp.name}</td>
                      <td style=\"padding:3px 8px;\">${kp.position}</td>
                      <td style=\"padding:3px 8px;\">${kp.email}</td>
                      <td style=\"padding:3px 8px;\">${kp.tel}</td>
                      <td style=\"padding:3px 8px;\">${kp.brand}</td>
                      <td style=\"padding:3px 8px; position:relative;\">
                        <button class=\"edit-keyperson-btn\" data-idx=\"${c.id}\" data-kpidx=\"${origKpIdx}\" data-id=\"${c.id}\" style=\"background:#3498db;color:#fff;border:2px solid #3498db;border-radius:4px;padding:2px 12px;font-size:14px;\">Edit</button>
                        <button class=\"delete-keyperson-btn\" data-idx=\"${c.id}\" data-kpidx=\"${origKpIdx}\" data-id=\"${c.id}\" style=\"background:#e74c3c;color:#fff;border:2px solid #e74c3c;border-radius:4px;padding:2px 12px;font-size:14px;margin-left:6px;\">Delete</button>
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

  // Re-apply highlight after rendering
  if (window.expandedCompanyId) {
    $('.company-row').removeClass('selected-row');
    $('.company-row td:first-child').removeClass('selected-cell');
    $(`.company-row[data-id="${window.expandedCompanyId}"]`).addClass('selected-row');
    $(`.company-row[data-id="${window.expandedCompanyId}"] td:first-child`).addClass('selected-cell');
    // Highlight all key people rows for this company
    $(`.keyperson-row[data-idx="${window.expandedCompanyId}"]`).addClass('selected-row');
    $(`.keyperson-row[data-idx="${window.expandedCompanyId}"] td:first-child`).addClass('selected-cell');
    // Optionally, still highlight the one being edited (if needed)
    if (typeof window.editSingleKeyPersonIdx !== 'undefined') {
      $(`.keyperson-row[data-idx="${window.expandedCompanyId}"][data-kpidx="${window.editSingleKeyPersonIdx}"]`).addClass('selected-row');
      $(`.keyperson-row[data-idx="${window.expandedCompanyId}"][data-kpidx="${window.editSingleKeyPersonIdx}"] td:first-child`).addClass('selected-cell');
    }
  }

  // Remove hover event handlers for action dropdown
  // Add click-to-toggle logic for action dropdown
  $('#search-results').off('mouseenter mouseleave', '.action-btn-wrap');
  $('#search-results').off('mouseenter mouseleave', '.action-dropdown');

  // Toggle dropdown on Action button click
  $('#search-results').off('click', '.action-btn');
  $('#search-results').on('click', '.action-btn', function(e) {
    e.stopPropagation();
    // Close any other open dropdowns
    $('.action-dropdown').not($(this).siblings('.action-dropdown')).fadeOut(100);
    // Toggle this dropdown
    const $dropdown = $(this).siblings('.action-dropdown');
    if ($dropdown.is(':visible')) {
      $dropdown.fadeOut(100);
      } else {
      $dropdown.fadeIn(100);
    }
  });

  // Close dropdown when clicking outside
  $(document).off('click.actionDropdown');
  $(document).on('click.actionDropdown', function(e) {
    if (!$(e.target).closest('.action-btn-wrap').length) {
      $('.action-dropdown').fadeOut(100);
    }
  });

  // Remove previous handlers to avoid duplicates
  $('#search-results').off('click', '.action-edit');

  // Attach handler for Edit in dropdown
  $('#search-results').on('click', '.action-edit', function(e) {
    e.stopPropagation();
    const $row = $(this).closest('tr.company-row');
    const companyId = $(this).data('id');
    window.expandedCompanyId = companyId;
    renderSearchResultsWithKeyPeople(customers);
  });

  // Attach handler for key person Edit button
  $('#search-results').off('click', '.edit-keyperson-btn');
  $('#search-results').on('click', '.edit-keyperson-btn', function() {
    console.log('[DEBUG] .edit-keyperson-btn clicked', this, $(this).data());
    const companyId = $(this).data('id');
    const kpIdx = $(this).data('kpidx');
    console.log('[DEBUG] companyId:', companyId, 'kpIdx:', kpIdx);
    const cust = customers.find(c => c.id == companyId);
    console.log('[DEBUG] found customer:', cust);
    // Highlight selected company row and first cell
    $('.company-row').removeClass('selected-row');
    $('.company-row td:first-child').removeClass('selected-cell');
    $(`.company-row[data-id="${companyId}"]`).addClass('selected-row');
    $(`.company-row[data-id="${companyId}"] td:first-child`).addClass('selected-cell');
    // Highlight selected key person row and first cell
    $('.keyperson-row').removeClass('selected-row');
    $('.keyperson-row td:first-child').removeClass('selected-cell');
    $(`.keyperson-row[data-idx="${companyId}"][data-kpidx="${kpIdx}"]`).addClass('selected-row');
    $(`.keyperson-row[data-idx="${companyId}"][data-kpidx="${kpIdx}"] td:first-child`).addClass('selected-cell');
    currentCustomer = { ...cust }; // shallow copy
    editStep1Data = {
      company: cust.company,
      address: cust.address,
      website: cust.website,
      domains: normalizeDomains(cust.domains),
      customerType: cust.customerType
    };
    editStep2Data = { keyPeople: [ { ...cust.keyPeople[kpIdx] } ] };
    window.editSingleKeyPersonMode = true;
    window.editSingleKeyPersonIdx = kpIdx;
    showEditCustomerStep2();
  });

  // Add User handler
  $('#search-results').off('click', '.action-add-user');
  $('#search-results').on('click', '.action-add-user', function(e) {
    e.stopPropagation();
    const companyId = $(this).data('id');
    const cust = customers.find(c => c.id == companyId);
    slide1Data = {
      company: cust.company,
      address: cust.address,
      website: cust.website,
      domains: normalizeDomains(cust.domains),
    };
    slide2Data = { keyPeople: [{ name: '', position: '', email: '', tel: '', brand: '' }] };
    window.addUserCompanyId = companyId;
    showCreateSlide2();
  });

  // Attach handler for company Edit button
  $('#search-results').off('click', '.edit-company-btn');
  $('#search-results').on('click', '.edit-company-btn', function() {
    const id = $(this).data('id');
    const cust = customers.find(c => c.id == id);
    if (!cust) {
      console.error('[ERROR] Customer not found for edit-company-btn', id, customers);
      return;
    }
    // Highlight selected company row and first cell
    $('.company-row').removeClass('selected-row');
    $('.company-row td:first-child').removeClass('selected-cell');
    $(`.company-row[data-id="${id}"]`).addClass('selected-row');
    $(`.company-row[data-id="${id}"] td:first-child`).addClass('selected-cell');
    currentCustomer = { ...cust }; // shallow copy
    editStep1Data = {
      company: cust.company,
      address: cust.address,
      website: cust.website,
      domains: normalizeDomains(cust.domains),
      customerType: cust.customerType
    };
    editStep2Data = (cust.keyPeople && cust.keyPeople.length > 0)
      ? { keyPeople: cust.keyPeople.map(kp => ({ ...kp })) }
      : { keyPeople: [{ name: '', position: '', email: '', tel: '', brand: '' }] };
    showEditCustomerStep1();
  });

  // Attach handler for key person Delete button
  $('#search-results').off('click', '.delete-keyperson-btn');
  $('#search-results').on('click', '.delete-keyperson-btn', function() {
    const companyId = $(this).data('id');
    const kpIdx = $(this).data('kpidx');
    const cust = customers.find(c => c.id == companyId);
    if (!cust) return;
    if (!Array.isArray(cust.keyPeople) || cust.keyPeople.length <= 1) {
      showCustomPopup('A company must have at least one key person.', true);
      return;
    }
    const kpName = cust.keyPeople[kpIdx] ? cust.keyPeople[kpIdx].name : '';
    if (confirm(`Are you sure you want to delete key person "${kpName}"? This action cannot be undone.`)) {
      cust.keyPeople.splice(kpIdx, 1);
      // Recalculate domains from remaining key people emails
      const domains = [];
      cust.keyPeople.forEach(kp => {
        if (kp.email && kp.email.includes('@')) {
          const domain = kp.email.split('@')[1].trim();
          if (domain && !domains.includes(domain)) domains.push(domain);
        }
      });
      cust.domains = domains;
      updateCustomer(companyId, cust, function() {
        fetchCustomers(function() {
          showCustomPopup(`Key person "${kpName}" deleted!`);
          renderSearchResultsWithKeyPeople(customers);
        });
      });
    }
  });
}

// Add key people filter logic
$('#right-frame').off('input', '.keypeople-filter-input');
$('#right-frame').on('input', '.keypeople-filter-input', function() {
  const companyId = $(this).data('id');
  // Gather all filter values for this company
  const filters = {};
  $(`.keypeople-filter-input[data-id='${companyId}']`).each(function() {
    const col = $(this).data('col');
    filters[col] = $(this).val().toLowerCase();
  });
  const c = customers.find(cust => cust.id == companyId);
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
      <td style="padding:3px 8px;"><button class="edit-keyperson-btn" data-idx="${companyId}" data-kpidx="${kp._origKpIdx}" data-id="${c.id}" style="background:#3498db;color:#fff;border:2px solid #3498db;border-radius:4px;padding:2px 12px;font-size:14px;">Edit</button></td>
    </tr>
  `).join('');
  $(`#keypeople-tbody-${companyId}`).html(tbody);
});

// Expand/Collapse logic only
$('#right-frame').off('click', '.expand-company-btn');
$('#right-frame').on('click', '.expand-company-btn', function() {
  const idx = $(this).data('idx');
  $(`.expand-row`).hide();
  $(`#expand-row-${idx}`).toggle();
});



function handleEditCustomer() {
    const id = $(this).data('id');
    const cust = customers.find(c => c.id === id);
    if (!cust) return;
    currentCustomer = cust;
    editStep1Data = {
      company: cust.company || '',
      address: cust.address || '',
      website: cust.website || '',
      domains: (cust.domains && cust.domains.split) ? cust.domains.split(',').map(d => d.trim()) : [],
      customerType: cust.customerType || ''
    };
    // For brands, check if we need to split them
    editStep2Data = { keyPeople: [] };
    if (cust.keyPeople && cust.keyPeople.length > 0) {
      editStep2Data.keyPeople = cust.keyPeople.map(kp => {
        return {
          name: kp.name || '',
          position: kp.position || '',
          email: kp.email || '',
          tel: kp.tel || '',
          brand: kp.brand || ''
        };
      });
    }
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
  $.get('/option_databases', function(databases) {
    const customerTypeDb = databases.find(db => db.name.toLowerCase() === 'customer type');
    let customerTypeOptions = '';
    if (customerTypeDb) {
      customerTypeOptions = customerTypeDb.fields.map(opt => `<option value="${opt.value}"${editStep1Data.customerType === opt.value ? ' selected' : ''}>${opt.value}</option>`).join('');
    }
    $('#right-frame').html(`
      <button id="back-to-modify" style="margin-bottom:12px;background:#eee;border:1px solid #bbb;border-radius:4px;padding:4px 16px;font-size:14px;">Back</button>
      <h2>Edit Customer - Step 1</h2>
      <label>Company Name:<br><input type="text" id="edit-company" value="${editStep1Data.company}"></label><br>
      <label>Address:<br><input type="text" id="edit-address" value="${editStep1Data.address}"></label><br>
      <label>Website:<br><input type="text" id="edit-website" value="${editStep1Data.website}"></label><br>
      <label>Domains:<br>
        <div class="domain-list" id="edit-domain-list">
          ${domainInputs}
        </div>
      </label><br>
      <div id="customer-type-row">
        <label>Customer Type:<br>
          <select id="edit-customer-type-select">
            <option value="">-- Select --</option>
            ${customerTypeOptions}
          </select>
        </label>
      </div>
      <button id="update-edit-step1" disabled style="opacity:0.5;cursor:not-allowed;background:#3498db;color:#fff;border:2px solid #3498db;border-radius:4px;padding:2px 12px;font-size:14px;">Update</button>
    `);
    updateEditDomainButtons();

    // Restore previous selection if any
    if (editStep1Data.customerType) {
      $('#edit-customer-type-select').val(editStep1Data.customerType);
    }
    // Save selection on change
    $('#edit-customer-type-select').off('change').on('change', function() {
      editStep1Data.customerType = $(this).val();
    });

    $('#back-to-modify').off('click').on('click', function() {
      showModify();
    });

    function isStep1Changed() {
      if (!currentCustomer) return false;
      const orig = currentCustomer;
      const curr = {
        company: $('#edit-company').val().trim(),
        address: $('#edit-address').val().trim(),
        website: $('#edit-website').val().trim(),
        domains: $('#edit-domain-list .edit-domain-input').map(function() { return $(this).val().trim(); }).get().filter(Boolean),
        customerType: $('#edit-customer-type-select').val()
      };
      const domainsEqual = Array.isArray(orig.domains) ?
        JSON.stringify(orig.domains) === JSON.stringify(curr.domains) :
        (typeof orig.domains === 'string' ? orig.domains.split(',').join(',') === curr.domains.join(',') : false);
      return !(
        orig.company === curr.company &&
        orig.address === curr.address &&
        orig.website === curr.website &&
        domainsEqual &&
        (orig.customerType || '') === (curr.customerType || '')
      );
    }

    $('#right-frame').off('input change', '#edit-company, #edit-address, #edit-website, .edit-domain-input, #edit-customer-type-select');
    $('#right-frame').on('input change', '#edit-company, #edit-address, #edit-website, .edit-domain-input, #edit-customer-type-select', function(e) {
      console.log('[DEBUG] Input/change detected:', e.target.id || e.target.className, $(this).val());
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
      // Require customer type
      if (!$('#edit-customer-type-select').val()) {
        showCustomPopup('Customer Type is required.', true);
        $('#edit-customer-type-select').addClass('highlight-error');
        return;
      } else {
        $('#edit-customer-type-select').removeClass('highlight-error');
      }
      // Save edits
      editStep1Data.company = $('#edit-company').val().trim();
      editStep1Data.address = $('#edit-address').val().trim();
      editStep1Data.website = $('#edit-website').val().trim();
      editStep1Data.domains = $('#edit-domain-list .edit-domain-input').map(function() { return $(this).val().trim(); }).get().filter(Boolean);
      editStep1Data.customerType = $('#edit-customer-type-select').val();
      // Prepare customer object for update (include keyPeople to preserve them)
      const id = currentCustomer.id;
      const customer = {
        company: editStep1Data.company,
        address: editStep1Data.address,
        website: editStep1Data.website,
        domains: editStep1Data.domains,
        customerType: editStep1Data.customerType,
        keyPeople: Array.isArray(currentCustomer.keyPeople) ? currentCustomer.keyPeople : []
      };
      // Show loading overlay
      if ($('#update-loading-overlay').length === 0) {
        $('body').append('<div id="update-loading-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;"><div style="color:#fff;font-size:22px;">Updating...</div></div>');
      }
      // Send update to backend
      $.ajax({
        url: '/customers/' + id,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(customer),
        success: function() {
          setTimeout(function() {
            $('#update-loading-overlay').remove();
            fetchCustomers(function() {
              showModify();
              showCustomPopup('Record updated!');
            });
          }, 500);
        },
        error: function() {
          setTimeout(function() {
            $('#update-loading-overlay').remove();
            showCustomPopup('Update failed!', true);
          }, 500);
        }
      });
    });
  });
}

function showEditCustomerStep2() {
  let isAddUserMode = !!window.addUserCompanyId;
  $.get('/option_databases', function(databases) {
    const brandDb = databases.find(db => db.name.toLowerCase() === 'brand');
    let brandOptions = '<option value="">-- No brand --</option>';
    if (brandDb) {
      brandOptions += brandDb.fields.map(opt => `<option value="${opt.value}">${opt.value}</option>`).join('');
    }
    // Render form for editing a single key person
    const kp = editStep2Data.keyPeople[0];
    let emailPrefix = kp.email && kp.email.includes('@') ? kp.email.split('@')[0] : '';
    let emailDomain = kp.email && kp.email.includes('@') ? kp.email.split('@')[1] : (editStep1Data.domains && editStep1Data.domains[0] ? editStep1Data.domains[0] : '');
    let domainSelect = '';
    if (editStep1Data.domains.length > 1) {
      domainSelect = `<select class="keyperson-email-domain">${editStep1Data.domains.map(d => `<option value="${d}"${d===emailDomain?' selected':''}>${d}</option>`).join('')}</select>`;
    } else {
      domainSelect = `<input type="text" value="${editStep1Data.domains[0] || ''}" disabled class="keyperson-email-domain">`;
    }
    let brandField = '';
    if (brandDb) {
      brandField = `<select class="person-brand"><option value="">-- Select --</option>${brandDb.fields.map(opt => `<option value="${opt.value}"${kp.brand === opt.value ? ' selected' : ''}>${opt.value}</option>`).join('')}</select>`;
    } else {
      brandField = `<input type="text" class="person-brand" value="${kp.brand || ''}">`;
    }
    $('#right-frame').html(`
      <button id="back-to-edit-step1" style="margin-bottom:12px;background:#eee;border:1px solid #bbb;border-radius:4px;padding:4px 16px;font-size:14px;">Back</button>
      <h2>Edit Key Person</h2>
      <div class="keyperson-form" data-index="0">
        <label>Name:<br><input type="text" class="person-name" value="${kp.name || ''}"></label><br>
        <label>Position:<br><input type="text" class="person-position" value="${kp.position || ''}"></label><br>
        <label>Email:<br>
          <input type="text" class="email-prefix" placeholder="prefix" value="${emailPrefix}">
          @
          ${domainSelect}
        </label><br>
        <label>Tel:<br><input type="text" class="person-tel" value="${kp.tel || ''}"></label><br>
        <label>Brand:<br>${brandField}</label><br>
      </div>
      <button id="save-keyperson-edit" style="background:#3498db;color:#fff;border:2px solid #3498db;border-radius:4px;padding:2px 12px;font-size:14px;">Save</button>
    `);
    // Back button
    $('#back-to-edit-step1').off('click').on('click', function() {
      showEditCustomerStep1();
    });
    // Save button
    $('#save-keyperson-edit').off('click').on('click', function() {
      // Gather edited key person data
      const name = $('.person-name').val().trim();
      const position = $('.person-position').val().trim();
      const emailPrefix = $('.email-prefix').val().trim();
      let domain = '';
      if ($('.keyperson-email-domain').is('select')) {
        domain = $('.keyperson-email-domain').val();
      } else {
        domain = $('.keyperson-email-domain').val();
      }
      const email = emailPrefix && domain ? `${emailPrefix}@${domain}` : '';
      const tel = $('.person-tel').val().trim();
      const brand = $('.person-brand').val();
      // Validation (minimal)
      if (!name || !position || !emailPrefix || !tel || !brand) {
        showCustomPopup('All fields are required.', true);
        return;
      }
      // Update keyPeople in currentCustomer
      const kpIdx = window.editSingleKeyPersonIdx;
      const updatedKeyPeople = Array.isArray(currentCustomer.keyPeople) ? [...currentCustomer.keyPeople] : [];
      updatedKeyPeople[kpIdx] = { name, position, email, tel, brand };
      // Recalculate domains from all key people emails
      const domains = [];
      updatedKeyPeople.forEach(kp => {
        if (kp.email && kp.email.includes('@')) {
          const d = kp.email.split('@')[1].trim();
          if (d && !domains.includes(d)) domains.push(d);
        }
      });
      // Prepare updated customer object
      const updatedCustomer = {
        ...currentCustomer,
        keyPeople: updatedKeyPeople,
        domains: domains.length > 0 ? domains : currentCustomer.domains
      };
      // Show loading overlay
      if ($('#update-loading-overlay').length === 0) {
        $('body').append('<div id="update-loading-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;"><div style="color:#fff;font-size:22px;">Updating...</div></div>');
      }
      // Save to backend
      updateCustomer(currentCustomer.id, updatedCustomer, function(success) {
        setTimeout(function() {
          $('#update-loading-overlay').remove();
          if (success) {
            window.editSingleKeyPersonMode = false;
            window.editSingleKeyPersonIdx = undefined;
            fetchCustomers(function() {
              showModify();
              showCustomPopup('Key person updated!');
            });
          } else {
            showCustomPopup('Update failed!', true);
          }
        }, 500);
      });
    });
  });
}

// Database Manager
function showCustomerDatabaseManager() {
  $.get('/option_databases', function(databases) {
    $('#right-frame').html(`
      <h2>Database Manager</h2>
      <div class="database-manager">
        <div class="database-list">
          <h3>Database Types</h3>
          <ul>
            ${databases.map(db => `<li data-id="${db.id}" class="db-selector">${db.name}</li>`).join('')}
          </ul>
          <button class="add-database-btn">Add Database</button>
        </div>
        <div class="database-detail">
          <h3>Database Values</h3>
          <div id="database-options-area">Select a database to view options</div>
        </div>
      </div>
    `);
    
    // If there's at least one database, show its values
    if (databases.length > 0) {
      renderDbOptionsArea(databases[0]);
    }
    
    // Handlers
    $('.database-list').on('click', '.db-selector', function() {
      const dbId = $(this).data('id');
      const db = databases.find(d => d.id === dbId);
      if (db) {
        renderDbOptionsArea(db);
      }
    });
    
    $('.database-list').on('click', '.add-database-btn', function() {
      const dbName = prompt('Enter new database name:');
      if (!dbName) return;
      
      $.ajax({
        url: '/option_databases',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ name: dbName }),
        success: function() {
          showCustomPopup('Database added!');
          showCustomerDatabaseManager();
        }
      });
    });
  });
}

// Functions to handle option database operations
function checkOptionExists(dbId, value, callback) {
  $.get('/option_fields/check', { database_id: dbId, value }, function(resp) {
    if (resp.exists) {
      alert('This option already exists!');
    } else if (callback) {
      callback(dbId, value);
    }
  });
}

function addOptionToDatabase(dbId, value) {
  $.ajax({
    url: '/option_fields',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ database_id: dbId, value: value }),
    success: function() {
      $.get('/option_databases', function(dbs) {
        const updatedDb = dbs.find(d => d.id === dbId);
        if (updatedDb) {
          renderDbOptionsArea(updatedDb);
        }
      });
    }
  });
}

function deleteOptionFromDatabase(dbId, optionId) {
  $.ajax({
    url: '/option_fields/' + optionId,
    type: 'DELETE',
    success: function() {
      $.get('/option_databases', function(dbs) {
        const updatedDb = dbs.find(d => d.id === dbId);
        if (updatedDb) {
          renderDbOptionsArea(updatedDb);
        }
      });
    }
  });
}

// --- Authorized Person Tab Logic ---
$(function() {
  // Always fetch users when the page loads
  fetchAndRenderUsers();
  // Also fetch when the tab is clicked
  $('#authorized-person-tab').on('click', function() {
    fetchAndRenderUsers();
  });

  // Save/Add user button
  $('#saveUserBtn').on('click', function() {
    const id = $('#userId').val();
    const email = $('#userEmail').val().trim();
    const permission_level = $('#userLevel').val();
    if (!email) {
      alert('Email is required');
      return;
    }
    if (id) {
      // Edit user
      $.ajax({
        url: `/admin/users/${id}`,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ permission_level }),
        success: function() {
          $('#userModal').modal('hide');
          fetchAndRenderUsers();
        },
        error: function(xhr) {
          alert(xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Error updating user');
        }
      });
    } else {
      // Add user
      $.ajax({
        url: '/admin/users',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ email, permission_level }),
        success: function() {
          $('#userModal').modal('hide');
          fetchAndRenderUsers();
        },
        error: function(xhr) {
          alert(xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Error adding user');
        }
      });
    }
  });

  // Show add user modal
  window.showAddUserModal = function() {
    $('#userModalTitle').text('Add User');
    $('#userEmail').val('');
    $('#userLevel').val('1');
    $('#userId').val('');
    $('#userEmail').prop('disabled', false);
    $('#userModal').modal('show');
  };

  // Edit user
  $('#users-table').on('click', '.edit-user-btn', function() {
    const id = $(this).data('id');
    const email = $(this).data('email');
    const level = $(this).data('level');
    $('#userModalTitle').text('Edit User');
    $('#userEmail').val(email);
    $('#userLevel').val(level);
    $('#userId').val(id);
    $('#userEmail').prop('disabled', true);
    $('#userModal').modal('show');
  });

  // Delete user
  $(document).off('click', '.delete-user-btn');
  $(document).on('click', '.delete-user-btn', function() {
    const id = $(this).data('id');
    const email = $(this).data('email');
    if (!confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) return;
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
});

function fetchAndRenderUsers() {
  $.get('/admin/users', function(users) {
    users.sort((a, b) => {
      if (b.approved_at && a.approved_at) return b.approved_at.localeCompare(a.approved_at);
      return 0;
    });
    const filter = $('#user-filter-input').val() ? $('#user-filter-input').val().toLowerCase() : '';
    let filtered = users;
    if (filter) {
      filtered = filtered.filter(u => u.email.toLowerCase().includes(filter));
    }

    // Always update style for user actions
    $('#user-actions-style').remove();
    $('head').append(`
      <style id="user-actions-style">
        #users-table td:last-child {
          min-width: 350px !important;
          white-space: nowrap !important;
          text-align: left !important;
        }
        .action-btn {
          margin: 0 3px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          display: inline-block;
        }
        .action-btn.edit { background: #ffe066; color: #333; border: 1px solid #e6b800; }
        .action-btn.delete-user-btn { background: #dc3545; color: white; border: 1px solid #bd2130; font-weight: bold; font-size: 16px; padding: 4px 12px; }
        .action-btn.activate { background: #28a745; color: white; border: 1px solid #1e7e34; }
        .action-btn.deactivate { background: #ffc107; color: #000; border: 1px solid #d39e00; }
      </style>
    `);

    const tbody = filtered.map(u => {
      let status = 'Pending';
      if (u.is_active === 0) status = 'Inactive';
      else if (u.permission_level) status = 'Active';

      return `
      <tr${!u.permission_level ? ' style=\"background:#fffbe6\"' : ''}>
        <td><input type=\"checkbox\" class=\"user-select-checkbox\" data-id=\"${u.id}\" data-email=\"${u.email}\" data-level=\"${u.permission_level || ''}\" ${u.is_active === 0 ? 'disabled' : ''}></td>
        <td>${u.email}</td>
        <td>${status}</td>
        <td>
          <select class=\"form-control user-level-select\" data-id=\"${u.id}\" data-original=\"${u.permission_level || ''}\" ${u.is_active === 0 ? 'disabled' : ''}>
            <option value=\"\"${!u.permission_level ? ' selected' : ''}>No Level</option>
            <option value=\"1\"${u.permission_level==1?' selected':''}>Level 1 (Add/Edit)</option>
            <option value=\"2\"${u.permission_level==2?' selected':''}>Level 2 (Add/Edit/Delete)</option>
            <option value=\"3\"${u.permission_level==3?' selected':''}>Level 3 (Admin)</option>
          </select>
        </td>
        <td>
          <button class=\"action-btn edit\" data-id=\"${u.id}\" data-email=\"${u.email}\" data-level=\"${u.permission_level || ''}\">Edit</button>
          ${u.is_active === 0 
            ? `<button class=\"action-btn activate\" data-id=\"${u.id}\">Activate</button>` 
            : (u.permission_level !== 3 ? `<button class=\"action-btn deactivate\" data-id=\"${u.id}\">Deactivate</button>` : '')
          }
          ${u.permission_level !== 3 ? `<button class=\"action-btn delete-user-btn\" data-id=\"${u.id}\" data-email=\"${u.email}\">🗑️</button>` : ''}
        </td>
      </tr>
      `;
    }).join('');
    $('#users-table tbody').html(tbody);

    // Rebind event handlers
    $('.action-btn.edit').off('click').on('click', function() {
      const id = $(this).data('id');
      const email = $(this).data('email');
      const level = $(this).data('level');
      // Your existing edit logic
    });

    $('.action-btn.delete-user-btn').off('click').on('click', function() {
      const id = $(this).data('id');
      const email = $(this).data('email');
      if (!confirm(`Are you sure you want to delete user \"${email}\"? This action cannot be undone.`)) return;
      
      $.ajax({
        url: `/admin/users/${id}`,
        type: 'DELETE',
        success: function() {
          fetchAndRenderUsers();
          showCustomPopup('User deleted successfully');
        },
        error: function(xhr) {
          showCustomPopup(xhr.responseJSON?.error || 'Error deleting user', true);
        }
      });
    });
  });
}

// Delete user handler
$(document).off('click', '.delete-user-btn');
$(document).on('click', '.delete-user-btn', function() {
  const id = $(this).data('id');
  const email = $(this).data('email');
  if (!confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) return;
  
  $.ajax({
    url: `/admin/users/${id}`,
    type: 'DELETE',
    success: function() {
      fetchAndRenderUsers();
      showCustomPopup('User deleted successfully');
    },
    error: function(xhr) {
      showCustomPopup(xhr.responseJSON?.error || 'Error deleting user', true);
    }
  });
});

// Batch select logic
$(document).off('change', '#select-all-users');
$(document).on('change', '#select-all-users', function() {
  const checked = $(this).is(':checked');
  $('.user-select-checkbox:enabled').prop('checked', checked);
});

// Batch set level logic
$(document).off('click', '#batch-set-level');
$(document).on('click', '#batch-set-level', function() {
  let level = $('#batch-level-select').val();
  if (level === '') { alert('Please select a level.'); return; }
  if (level === 'none') level = null;
  const ids = $('.user-select-checkbox:checked').map(function() { return $(this).data('id'); }).get();
  if (ids.length === 0) { alert('Please select at least one user.'); return; }
  if (!confirm(`Are you sure you want to set level ${level === null ? 'No Level' : level} for ${ids.length} user(s)?`)) return;
  ids.forEach(id => {
    $.ajax({
      url: `/admin/users/${id}`,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ permission_level: level }),
      success: function() { fetchAndRenderUsers(); }
    });
  });
});

// Handle Delete Customer
$(document).on('click', '.delete-customer-btn', function() {
  const id = $(this).data('id');
  const cust = customers.find(c => c.id === id);
  if (!confirm(`Are you sure you want to delete customer "${cust.company}"?`)) {
    return;
  }
  
  $.ajax({
    url: '/customers/' + cust.id,
    type: 'DELETE',
    success: function() {
      fetchCustomers(function() {
        showModify();
        showCustomPopup('Customer deleted!');
      });
    }
  });
});

// Functions to render option databases
function renderDbOptionsArea(db) {
  if (!db || !db.id) {
    console.error('[ERROR] Invalid database object passed to renderDbOptionsArea');
    showCustomPopup('Error: Invalid database selection', true);
    return;
  }
  
  let optionsHtml = db.fields.map(opt => `
    <li>
      ${opt.value}
      <button class="delete-option-btn" data-id="${opt.id}" data-db-id="${db.id}">Delete</button>
    </li>
  `).join('');
  
  $('#database-options-area').html(`
    <h3>${db.name}</h3>
    <ul class="options-list">
      ${optionsHtml}
    </ul>
    <div class="add-option-form">
      <input type="text" id="new-option-value" placeholder="New option value">
      <button id="add-option-btn" data-db-id="${db.id}">Add</button>
    </div>
  `);

  // Add option handler
  $('#add-option-btn').off('click').on('click', function() {
    const value = $('#new-option-value').val().trim();
    if (!value) {
      alert('Please enter a value');
      return;
    }
    
    const dbId = $(this).data('db-id');
    
    // Check if option already exists using our helper function
    checkOptionExists(dbId, value, function(dbId, value) {
      // This callback only runs if option doesn't exist
      addOptionToDatabase(dbId, value);
    });
  });

  // Delete option handler
  $('.delete-option-btn').off('click').on('click', function() {
    const optId = $(this).data('id');
    const dbId = $(this).data('db-id');
    if (!confirm('Are you sure you want to delete this option?')) return;
    
    // Use our helper function
    deleteOptionFromDatabase(dbId, optId);
  });
}

// Add the missing functions for edit domain fields
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

// Handle JavaScript errors globally
window.onerror = function(message, source, lineno, colno, error) {
  console.error('JavaScript error:', message, 'at line', lineno, 'column', colno, '\nSource:', source, '\nError:', error);
  showCustomPopup('An error occurred. Please try again. Error details in console.', true);
  return false; // Let the default error handler run as well
};

// Make sure normalizeDomains function exists
if (typeof normalizeDomains !== 'function') {
  function normalizeDomains(domains) {
    if (!domains) return [];
    if (Array.isArray(domains)) return domains;
    if (typeof domains === 'string') {
      return domains.split(',').map(d => d.trim()).filter(Boolean);
    }
    return [];
  }
}

function showQuotationCreateForm() {
  fetchCustomers(function() {
    const productTypeFields = {
      "heat transfer": [
        { name: "quality", label: "Quality", type: "select", options: ["PU", "Silicon"] },
        { name: "flatOrRaised", label: "Flat or Raised", type: "select", options: ["Flat", "Raised"] },
        { name: "directOrReverse", label: "Direct or Reverse", type: "select", options: ["Direct", "Reverse"], dependsOn: { field: "flatOrRaised", value: "Raised" } },
        { name: "thickness", label: "Thickness", type: "number", dependsOn: { field: "flatOrRaised", value: "Raised" } },
        { name: "numColors", label: "# of Colors", type: "number" },
        { name: "colorNames", label: "Color Names", type: "dynamic", dependsOn: { field: "numColors" } },
        { name: "width", label: "Width", type: "number" },
        { name: "length", label: "Length", type: "number" }
      ],
      "pfl": [
        { name: "material", label: "Material", type: "text" },
        { name: "edge", label: "Edge", type: "text" },
        { name: "cutAndFold", label: "Cut and Fold", type: "text" },
        { name: "width", label: "Width", type: "number" },
        { name: "length", label: "Length", type: "number" },
        { name: "flatOrRaised", label: "Flat or Raised", type: "select", options: ["Flat", "Raised"] },
        { name: "directOrReverse", label: "Direct or Reverse", type: "select", options: ["Direct", "Reverse"], dependsOn: { field: "flatOrRaised", value: "Raised" } },
        { name: "thickness", label: "Thickness", type: "number", dependsOn: { field: "flatOrRaised", value: "Raised" } }
      ]
    };
    const productTypes = Object.keys(productTypeFields);
    let productTypeOptions = '<option value="">-- Select Product Type --</option>' + productTypes.map(pt => `<option value="${pt}">${pt}</option>`).join("");
    $('#right-frame').html(`
      <div style="padding:32px;max-width:600px;">
        <h2>Create Quotation</h2>
        <form id="quotation-create-form" autocomplete="off">
          <label>Company:<br>
            <input type="text" id="quotation-company-input" placeholder="Type to search..." autocomplete="off">
            <input type="hidden" id="quotation-company-id">
            <div id="company-suggestions" style="position:relative;"></div>
          </label><br><br>
          <label>Key Person:<br>
            <select id="quotation-keyperson" required disabled>
              <option value="">-- Select Key Person --</option>
            </select>
          </label><br><br>
          <label>Product Type:<br>
            <select id="quotation-product-type" required>
              ${productTypeOptions}
            </select>
          </label><br><br>
          <div id="quotation-dynamic-fields"></div>
          <br>
          <button type="submit" style="padding:8px 32px;">Submit</button>
        </form>
      </div>
    `);
    // --- Autocomplete logic for company ---
    $('#quotation-company-input').on('input', function() {
      const val = $(this).val().toLowerCase();
      let matches = customers.filter(c => c.company.toLowerCase().includes(val));
      let html = '';
      if (val && matches.length > 0) {
        html = '<ul style="position:absolute;z-index:10;background:#fff;border:1px solid #ccc;width:100%;list-style:none;padding:0;margin:0;max-height:180px;overflow-y:auto;">' +
          matches.map(c => `<li class="company-suggestion" data-id="${c.id}" style="padding:6px 12px;cursor:pointer;">${c.company}</li>`).join('') +
          '</ul>';
      }
      $('#company-suggestions').html(html);
      $('#quotation-company-id').val('');
      $('#quotation-keyperson').html('<option value="">-- Select Key Person --</option>').prop('disabled', true);
    });
    // Click on suggestion
    $('#company-suggestions').on('click', '.company-suggestion', function() {
      const id = $(this).data('id');
      const company = customers.find(c => c.id == id);
      $('#quotation-company-input').val(company.company);
      $('#quotation-company-id').val(company.id);
      $('#company-suggestions').empty();
      // Populate key people
      let kpOpts = '<option value="">-- Select Key Person --</option>';
      if (company && Array.isArray(company.keyPeople)) {
        kpOpts += company.keyPeople.map((kp, idx) => `<option value="${idx}">${kp.name} (${kp.position})</option>`).join('');
        $('#quotation-keyperson').prop('disabled', false);
      } else {
        $('#quotation-keyperson').prop('disabled', true);
      }
      $('#quotation-keyperson').html(kpOpts);
    });
    $('#quotation-company-input').on('blur', function() {
      setTimeout(() => { $('#company-suggestions').empty(); }, 200);
    });
    $('#quotation-product-type').on('change', function() {
      renderDynamicFields();
    });
    function renderDynamicFields() {
      // --- Preserve current values ---
      const prevVals = {};
      $('#quotation-dynamic-fields').find('input, select').each(function() {
        prevVals[$(this).attr('name')] = $(this).val();
      });
      const type = $('#quotation-product-type').val();
      const fields = productTypeFields[type] || [];
      let html = '';
      let flatOrRaised = prevVals['flatOrRaised'] || $('#quotation-dynamic-fields [name="flatOrRaised"]').val() || '';
      let numColors = parseInt(prevVals['numColors'] || $('#quotation-dynamic-fields [name="numColors"]').val() || '0', 10);
      fields.forEach(field => {
        if (field.dependsOn) {
          if (field.dependsOn.field === 'flatOrRaised') {
            if ((flatOrRaised !== field.dependsOn.value)) {
              if (field.name === 'directOrReverse') {
                html += `<label>${field.label}:<br><input type="text" value="Direct" disabled></label><br>`;
              } else if (field.name === 'thickness') {
                html += `<label>${field.label}:<br><input type="number" disabled></label><br>`;
              }
              return;
            }
          }
        }
        if (field.type === 'select') {
          html += `<label>${field.label}:<br><select name="${field.name}"><option value="">-- Select --</option>${field.options.map(opt => `<option value="${opt}"${prevVals[field.name] === opt ? ' selected' : ''}>${opt}</option>`).join('')}</select></label><br>`;
        } else if (field.type === 'number') {
          html += `<label>${field.label}:<br><input type="number" name="${field.name}" min="0" value="${prevVals[field.name] || ''}"></label><br>`;
        } else if (field.type === 'text') {
          html += `<label>${field.label}:<br><input type="text" name="${field.name}" value="${prevVals[field.name] || ''}"></label><br>`;
        } else if (field.type === 'dynamic' && field.name === 'colorNames') {
          if (numColors > 0) {
            html += `<label>Color Names:<br>`;
            for (let i = 0; i < numColors; i++) {
              const cname = prevVals['colorName'+(i+1)] || '';
              html += `<input type="text" name="colorName${i+1}" placeholder="Color ${i+1}" value="${cname}"><br>`;
            }
            html += `</label><br>`;
          }
        }
      });
      $('#quotation-dynamic-fields').html(html);
      $('#quotation-dynamic-fields [name="flatOrRaised"]').off('change').on('change', renderDynamicFields);
      $('#quotation-dynamic-fields [name="numColors"]').off('input').on('input', renderDynamicFields);
    }
    // --- Form submission logic ---
    $('#quotation-create-form').off('submit').on('submit', function(e) {
      e.preventDefault();
      // Validate company
      const companyId = $('#quotation-company-id').val();
      if (!companyId) {
        showCustomPopup('Please select a company from the list.', true);
        return;
      }
      // Validate key person
      const keyPersonIdx = $('#quotation-keyperson').val();
      const company = customers.find(c => c.id == companyId);
      let keyPersonId = null;
      if (company && Array.isArray(company.keyPeople) && keyPersonIdx !== "") {
        const kp = company.keyPeople[keyPersonIdx];
        keyPersonId = kp && kp.id ? kp.id : null;
      }
      if (!keyPersonId) {
        showCustomPopup('Please select a key person.', true);
        return;
      }
      // Validate product type
      const productType = $('#quotation-product-type').val();
      if (!productType) {
        showCustomPopup('Please select a product type.', true);
        return;
      }
      // Gather dynamic fields
      const fields = productTypeFields[productType] || [];
      const attributes = {};
      let valid = true;
      fields.forEach(field => {
        if (field.type === 'dynamic' && field.name === 'colorNames') {
          const numColors = parseInt($('#quotation-dynamic-fields [name="numColors"]').val() || '0', 10);
          if (numColors > 0) {
            attributes['colorNames'] = [];
            for (let i = 0; i < numColors; i++) {
              const val = $('#quotation-dynamic-fields [name="colorName'+(i+1)+'"]').val();
              attributes['colorNames'].push(val);
            }
          }
        } else if (field.dependsOn) {
          const depVal = $('#quotation-dynamic-fields [name="'+field.dependsOn.field+'"]:visible').val();
          if (depVal !== field.dependsOn.value) {
            // skip, handled by UI
            return;
          }
          attributes[field.name] = $('#quotation-dynamic-fields [name="'+field.name+'"]').val();
        } else {
          attributes[field.name] = $('#quotation-dynamic-fields [name="'+field.name+'"]').val();
        }
      });
      // POST to backend
      $.ajax({
        url: '/quotations',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          customer_id: companyId,
          key_person_id: keyPersonId,
          product_type: productType,
          attributes: attributes
        }),
        success: function(resp) {
          showCustomPopup('Quotation created!', false);
          showQuotationCreateForm();
        },
        error: function(xhr) {
          let msg = 'Failed to create quotation.';
          try {
            const r = JSON.parse(xhr.responseText);
            if (r && r.error) msg += ' ' + r.error;
          } catch(e) {}
          showCustomPopup(msg, true);
        }
      });
    });
  });
}

$(document).off('click.customerModify').on('click.customerModify', '#btn-ay', function() {
  showModify();
});

// Click handler for the "Submit Quote" button visible to all users
$(document).on('click', '#all-users-btn', function() {
  // Show confirmation dialog
  if (confirm('Are you sure you want to submit this quotation?')) {
    showCustomPopup('Quotation submitted successfully!', false);
    // You can add actual submission logic here
  }
});