// Remove LocalStorage and in-memory array logic
// Use AJAX to communicate with Flask backend
let customers = [];
// Add a default definition to avoid ReferenceError
function handleSubmitSlide2() {}
  let currentCustomer = null;
  let slide1Data = {};
  let slide2Data = {};
let editStep1Data = {};
let editStep2Data = {};

function fetchCustomers(callback) {
  $.get('/customers', function(data) {
    customers = data;
    if (callback) callback();
  });
}

function createCustomer(customer, callback) {
  $.ajax({
    url: '/customers',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(customer),
    success: function() { if (callback) callback(); }
  });
}

function updateCustomer(id, customer, callback) {
  $.ajax({
    url: '/customers/' + id,
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
    // Removed duplicate Create button handler
    $('#btn-modify').click(showModify);
  
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
});
  
  // --- Create Customer Flow ---
  
  function showCreateSlide1() {
  // Use existing slide1Data or default
  const company = slide1Data.company || '';
  const address = slide1Data.address || '';
  const website = slide1Data.website || '';
  const domains = slide1Data.domains && slide1Data.domains.length > 0 ? slide1Data.domains : [''];
  
  // Pre-render the form with empty customer type options
  const renderForm = function(customerTypeOptions = '') {
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
  };
  
  // Fetch Customer Type options from backend
  $.get('/option_databases', function(databases) {
    const customerTypeDb = databases.find(db => db.name.toLowerCase() === 'customer type');
    let customerTypeOptions = '';
    if (customerTypeDb) {
      customerTypeOptions = customerTypeDb.fields.map(opt => `<option value="${opt.value}"${slide1Data.customerType === opt.value ? ' selected' : ''}>${opt.value}</option>`).join('');
    }
    renderForm(customerTypeOptions);
  }).fail(function(xhr) {
    // If request fails (e.g., 403 Forbidden), still render the form with empty options
    if (xhr.status === 403) {
      showCustomPopup('Note: Customer type options are not available with your permission level.', true);
    }
    renderForm();
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

    // Pre-render function with empty brandDb initially
    const renderForm = function(brandDb = null, isMulti = false) {
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
      
      // Save key people data on input/select
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
    };

    // Fetch Brand options from backend
    $.get('/option_databases', function(databases) {
      const brandDb = databases.find(db => db.name.toLowerCase().includes('brand'));
      let isMulti = false;
      if (brandDb) {
        isMulti = !!brandDb.is_multiselect;
      }
      renderForm(brandDb, isMulti);
    }).fail(function(xhr) {
      // If request fails (e.g., 403 Forbidden), still render the form with null brandDb
      if (xhr.status === 403) {
        showCustomPopup('Note: Brand options are not available with your permission level.', true);
      }
      renderForm(null, false);
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
          showCustomPopup(`Key person \"${kpName}\" deleted!`);
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
    const cust = customers.find(c => c.id == id);
    currentCustomer = { ...cust }; // shallow copy
  // Save initial data for editing
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
  
  // Prepare the HTML with empty customerTypeOptions initially
  const renderEditForm = function(customerTypeOptions = '') {
    const isLimitedAccess = customerTypeOptions.includes('Limited access');
    
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
          <select id="edit-customer-type-select"${isLimitedAccess ? ' disabled' : ''}>
            <option value="">-- Select --</option>
            ${customerTypeOptions}
          </select>
          ${isLimitedAccess ? '<div style="color:#e74c3c;font-size:12px;margin-top:4px;">Limited access: Using existing value due to permission level</div>' : ''}
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

    // Rest of the event handlers...
    // Function isStep1Changed and event handlers remain the same
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
      
      // Require customer type only if not in limited access mode
      const isLimitedAccess = $('#edit-customer-type-select').prop('disabled');
      if (!isLimitedAccess && !$('#edit-customer-type-select').val()) {
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
      // Send update to backend
      $.ajax({
        url: '/customers/' + id,
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
  };

  // Try to fetch customer types, but handle the case where it fails
  $.get('/option_databases', function(databases) {
    const customerTypeDb = databases.find(db => db.name.toLowerCase() === 'customer type');
    let customerTypeOptions = '';
    if (customerTypeDb) {
      customerTypeOptions = customerTypeDb.fields.map(opt => 
        `<option value="${opt.value}"${editStep1Data.customerType === opt.value ? ' selected' : ''}>${opt.value}</option>`
      ).join('');
    }
    renderEditForm(customerTypeOptions);
  }).fail(function(xhr) {
    // If request fails (e.g., 403 Forbidden), still render the form with empty options
    if (xhr.status === 403) {
      showCustomPopup('Note: Customer type options are not available with your permission level, but you can still edit other fields.', true);
      // Additional customer type option to indicate unavailability
      const limitedOptions = `<option value="${editStep1Data.customerType}" selected>${editStep1Data.customerType || 'Limited access'}</option>`;
      renderEditForm(limitedOptions);
    } else {
      showCustomPopup('Failed to load customer type options. You can still edit other fields.', true);
      renderEditForm();
    }
  });
}

function showEditCustomerStep2() {
  let isAddUserMode = !!window.addUserCompanyId;
  console.log('showEditCustomerStep2 called', editStep2Data);
  console.log('DEBUG at start of showEditCustomerStep2, editStep1Data:', editStep1Data);
  
  // Create a render function that will work with or without brandDb
  const renderForm = function(brandDb = null, isMulti = false) {
    // Use array for key people
    let keyPeople = Array.isArray(editStep2Data.keyPeople) && editStep2Data.keyPeople.length > 0
      ? editStep2Data.keyPeople
      : [editStep2Data && Object.keys(editStep2Data).length > 0 ? editStep2Data : { name: '', position: '', email: '', tel: '', brand: '' }];

    // If only one key person and we are in "edit single key person" mode, hide the Previous button
    const hidePrev = keyPeople.length === 1 && window.editSingleKeyPersonMode;

    function renderKeyPeopleForms() {
      let isAddUserMode = !!window.addUserCompanyId;
      return keyPeople.map((kp, idx) => {
        let emailPrefix = kp.email && kp.email.includes('@') ? kp.email.split('@')[0] : '';
        let emailDomain = kp.email && kp.email.includes('@') ? kp.email.split('@')[1] : (editStep1Data.domains && editStep1Data.domains[0] ? editStep1Data.domains[0] : '');
        let domainSelect = '';
        // Always render as disabled input, regardless of number of domains
        domainSelect = `<input type="text" value="${editStep1Data.domains && editStep1Data.domains[0] ? editStep1Data.domains[0] : ''}" disabled class="edit-keyperson-email-domain">`;
        // Remove button only if not in edit mode
        let removeBtn = (showRemoveKeyPerson && keyPeople.length > 1)
          ? `<button type="button" class="remove-edit-keyperson">Remove</button>`
          : '';
        // Brand field as dropdown or multi-select
        let brandField = '';
        if (brandDb) {
          if (isMulti) {
            const selected = Array.isArray(kp.brand)
              ? kp.brand
              : (typeof kp.brand === 'string' && kp.brand.includes(','))
                ? kp.brand.split(',').map(s => s.trim())
                : (kp.brand ? [kp.brand] : []);
            brandField = `<select class="person-brand" multiple style="height:60px;">${brandDb.fields.map(opt => `<option value="${opt.value}"${selected.includes(opt.value) ? ' selected' : ''}>${opt.value}</option>`).join('')}</select>`;
          } else {
            brandField = `<select class="person-brand"><option value="">-- Select --</option>${brandDb.fields.map(opt => `<option value="${opt.value}"${kp.brand === opt.value ? ' selected' : ''}>${opt.value}</option>`).join('')}</select>`;
          }
        } else {
          brandField = `<input type="text" class="person-brand" value="${kp.brand || ''}">`;
        }
        return `
          <div class="edit-keyperson-form" data-index="${idx}" style="border:1px solid #ccc; border-radius:8px; padding:18px 18px 10px 18px; margin-bottom:22px; background:#fafbfc; box-shadow:0 2px 8px #eee;">
            <div style="font-weight:bold; font-size:18px; margin-bottom:10px; color:#2a3b4c;">Key Person ${idx+1}</div>
            <div style="display:flex; flex-wrap:wrap; gap:18px 3%;">
              <div style="flex:1 1 45%; min-width:220px;"><label>Name:<br><input type="text" class="edit-person-name" value="${kp.name || ''}"></label></div>
              <div style="flex:1 1 45%; min-width:220px;"><label>Position:<br><input type="text" class="edit-person-position" value="${kp.position || ''}"></label></div>
              <div style="flex:1 1 45%; min-width:220px;"><label>Email Prefix:<br><input type="text" class="edit-email-prefix" placeholder="prefix" value="${emailPrefix}"></label></div>
              <div style="flex:1 1 45%; min-width:220px;"><label>Email Domain:<br>${domainSelect}</label></div>
              <div style="flex:1 1 45%; min-width:220px;"><label>Tel:<br><input type="text" class="edit-person-tel" value="${kp.tel || ''}"></label></div>
              <div style="flex:1 1 45%; min-width:220px;"><label>Brand:<br>${brandField}</label></div>
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

    // Company info box
    const companyInfoBox = `
      <div class="company-info-box" style="background:#f6fafd; border:1px solid #d0e0f0; border-radius:8px; padding:12px 18px; margin-bottom:18px;">
        <div><b>Company:</b> ${editStep1Data.company || ''}</div>
        <div><b>Address:</b> ${editStep1Data.address || ''}</div>
        <div><b>Website:</b> ${editStep1Data.website || ''}</div>
        <div><b>Domains:</b> ${(editStep1Data.domains || []).join(', ')}</div>
      </div>
    `;
    // Render the form
    const isEdit = !!window.editSingleKeyPersonMode || !!currentCustomer;
    let showDummyFill = !isEdit;
    let showRemoveKeyPerson = !isEdit;
    let showPrevious = !isEdit;
    let submitLabel = isEdit ? 'Update' : (isAddUserMode ? 'Update' : 'Submit');
    $('#right-frame').html(`
      ${showDummyFill ? '<div style="margin-bottom:18px;"><button id="dummy-fill-btn" style="background:#f39c12;color:#fff;border:none;border-radius:6px;padding:6px 18px;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;">Dummy Fill</button></div>' : ''}
      <button id="back-to-modify" style="margin-bottom:12px;background:#eee;border:1px solid #bbb;border-radius:4px;padding:4px 16px;font-size:14px;">Back</button>
      <h2>${isEdit ? 'Edit' : 'Create'} Customer - Step 2</h2>
      ${companyInfoBox}
      <div id="${isAddUserMode ? 'edit-keypeople-list' : 'keypeople-list'}">${renderKeyPeopleForms()}</div>
      <div class="slide-nav">
        ${showPrevious ? (isAddUserMode ? (hidePrev ? '' : '<button id="prev-edit-step2">Previous</button>') : '<button id="prev-slide2">Previous</button>') : ''}
        <button id="update-customer" disabled style="opacity:0.5;cursor:not-allowed;background:#3498db;color:#fff;border:2px solid #3498db;border-radius:4px;padding:2px 12px;font-size:14px;">${submitLabel}</button>
      </div>
    `);
    // Back button logic for Edit mode
    if (isEdit) {
      $('#back-to-modify').off('click').on('click', function() {
        window.editSingleKeyPersonMode = false;
        window.editSingleKeyPersonIdx = undefined;
        showModify();
      });
    }
    // Save key people data on input/select (fix selector to .edit-keyperson-form ...)
    $('#right-frame').off('input change', '.edit-keyperson-form input, .edit-keyperson-form select');
    $('#right-frame').on('input change', '.edit-keyperson-form input, .edit-keyperson-form select', function() {
      $(this).removeClass('highlight-error');
      const forms = $('.edit-keyperson-form');
      editStep2Data.keyPeople = [];
      forms.each(function() {
        const $form = $(this);
        const name = $form.find('.edit-person-name').val().trim();
        const position = $form.find('.edit-person-position').val().trim();
        const emailPrefix = $form.find('.edit-email-prefix').val().trim();
        let domain = '';
        if ($form.find('.edit-keyperson-email-domain').is('select')) {
          domain = ($form.find('.edit-keyperson-email-domain').val() || '').trim();
        } else {
          domain = ($form.find('.edit-keyperson-email-domain').val() || '').trim();
        }
        const email = emailPrefix && domain ? `${emailPrefix}@${domain}` : '';
        const tel = ($form.find('.edit-person-tel').val() || '').trim();
        let brand = '';
        if (brandDb) {
          if (isMulti) {
            brand = $form.find('.person-brand').val() ? Array.from($form.find('.person-brand').find('option:selected')).map(o => o.value) : [];
          } else {
            brand = $form.find('.person-brand').val();
          }
        } else {
          brand = $form.find('.person-brand').val().trim();
        }
        editStep2Data.keyPeople.push({ name, position, email, tel, brand });
      });
      // Enable/disable Update button based on changes
      if (isEdit) {
        const origKP = Array.isArray(currentCustomer.keyPeople) ? currentCustomer.keyPeople : [];
        const currKP = Array.isArray(editStep2Data.keyPeople) ? editStep2Data.keyPeople : [];
        let changed = false;
        if (origKP.length && currKP.length) {
          let orig = origKP[window.editSingleKeyPersonIdx || 0] || {};
          let curr = currKP[0];
          // Normalize brand to array for both orig and curr
          function normalizeBrand(val) {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
            return [];
          }
          // Normalize all fields for comparison
          orig = {
            name: orig.name || '',
            position: orig.position || '',
            email: orig.email || '',
            tel: orig.tel || '',
            brand: normalizeBrand(orig.brand)
          };
          curr = {
            name: curr.name || '',
            position: curr.position || '',
            email: curr.email || '',
            tel: curr.tel || '',
            brand: normalizeBrand(curr.brand)
          };
          // Deep compare all fields, including arrays (brand)
          function deepEqual(a, b) {
            if (Array.isArray(a) && Array.isArray(b)) {
              if (a.length !== b.length) return false;
              for (let i = 0; i < a.length; i++) {
                if (!b.includes(a[i])) return false;
              }
              return true;
            }
            return a === b;
          }
          changed = !(
            orig.name === curr.name &&
            orig.position === curr.position &&
            orig.email === curr.email &&
            orig.tel === curr.tel &&
            deepEqual(orig.brand, curr.brand)
          );
        }
        const updateBtn = $('#update-customer');
        if (changed) {
          updateBtn.prop('disabled', false).css({opacity: 1, cursor: 'pointer'});
        } else {
          updateBtn.prop('disabled', true).css({opacity: 0.5, cursor: 'not-allowed'});
        }
      }
    });
  
    // Add Update button handler
    $('#right-frame').off('click', '#update-customer');
    $('#right-frame').on('click', '#update-customer', function() {
      // Validate
      let problems = [];
      $('.edit-keyperson-form').each(function() {
        const $form = $(this);
        const name = $form.find('.edit-person-name').val().trim();
        const position = $form.find('.edit-person-position').val().trim();
        const emailPrefix = $form.find('.edit-email-prefix').val().trim();
        const domain = $form.find('.edit-keyperson-email-domain').val().trim();
        const tel = $form.find('.edit-person-tel').val().trim();
        const brand = $form.find('.person-brand').val();
        
        if (!name) {
          problems.push('Name is required');
          $form.find('.edit-person-name').addClass('highlight-error');
        }
        if (!position) {
          problems.push('Position is required');
          $form.find('.edit-person-position').addClass('highlight-error');
        }
        if (!emailPrefix) {
          problems.push('Email prefix is required');
          $form.find('.edit-email-prefix').addClass('highlight-error');
        }
        if (!domain) {
          problems.push('Email domain is required');
          $form.find('.edit-keyperson-email-domain').addClass('highlight-error');
        }
        if (!tel) {
          problems.push('Tel is required');
          $form.find('.edit-person-tel').addClass('highlight-error');
        }
        if (!brand || (Array.isArray(brand) && brand.length === 0)) {
          problems.push('Brand is required');
          $form.find('.person-brand').addClass('highlight-error');
        }
      });
      
      if (problems.length > 0) {
        showCustomPopup('Please fix the following:\n' + problems.join('\n'), true);
        return;
      }
      
      // Update the key person in the customer
      const newKeyPerson = editStep2Data.keyPeople[0];
      if (window.editSingleKeyPersonMode && typeof window.editSingleKeyPersonIdx !== 'undefined') {
        const idx = window.editSingleKeyPersonIdx;
        const customer = { ...currentCustomer };
        if (Array.isArray(customer.keyPeople) && customer.keyPeople.length > idx) {
          customer.keyPeople[idx] = newKeyPerson;
          updateCustomer(customer.id, customer, function(success) {
            if (success) {
              window.editSingleKeyPersonMode = false;
              window.editSingleKeyPersonIdx = undefined;
              window.expandedCompanyId = customer.id;
              showModify();
              showCustomPopup('Key person updated!');
            }
          });
        }
      }
    });
  };

  // Fetch Brand options from backend
  $.get('/option_databases', function(databases) {
    const brandDb = databases.find(db => db.name.toLowerCase().includes('brand'));
    let isMulti = false;
    if (brandDb) {
      isMulti = !!brandDb.is_multiselect;
    }
    renderForm(brandDb, isMulti);
  }).fail(function(xhr) {
    // If request fails (e.g., 403 Forbidden), still render the form with null brandDb
    if (xhr.status === 403) {
      showCustomPopup('Note: Brand options are not available with your permission level.', true);
    }
    renderForm(null, false);
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
    domains: normalizeDomains(cust.domains),
    customerType: cust.customerType
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

// Helper to normalize domains to array
function normalizeDomains(domains) {
  if (Array.isArray(domains)) return domains;
  if (typeof domains === 'string') {
    if (domains.includes(',')) return domains.split(',').map(d => d.trim());
    if (domains.trim() !== '') return [domains.trim()];
    return [];
  }
  return [];
}

// --- Customer Database Management UI (as Customer subfield) ---

$(function() {
  // Remove any main left-frame button for Customer - Database
  $('#btn-customer-database').remove();

  // Add Database button as a subfield under Customer if not present
  if ($('#btn-customer-db-sub').length === 0) {
    $('#customer-nested').append('<button id="btn-customer-db-sub">Database</button>');
  }

  // Navigation handler for the subfield
  $(document).on('click', '#btn-customer-db-sub', function() {
    showCustomerDatabaseManager();
  });
});

function showCustomerDatabaseManager() {
  const renderDatabaseManager = function(databases = []) {
    $('#right-frame').html(`
      <h2>Database Manager</h2>
      ${databases.length === 0 ? 
        '<div style="padding: 20px; text-align: center; background: #f8f9fa; border-radius: 6px; margin: 20px 0;">No databases available or insufficient permissions.</div>' :
        `<div class="database-manager">
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
        </div>`
      }
    `);
    
    // If there's at least one database, show its values
    if (databases.length > 0) {
      renderDbOptionsArea(databases[0]);
      
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
    }
  };

  checkDatabasePermission(function(hasPermission) {
    if (!hasPermission) {
      showCustomPopup('You need Level 3 permission to access database management.', true);
      return;
    }
    
    $.get('/option_databases', function(databases) {
      renderDatabaseManager(databases);
    }).fail(function(xhr) {
      if (xhr.status === 403) {
        showCustomPopup('Access denied. You need Level 3 permission to manage databases.', true);
        $('#btn-database, #btn-customer-db-sub').hide(); // Hide database buttons
        renderDatabaseManager([]);
      } else {
        showCustomPopup('Failed to load databases. Please try again.', true);
        renderDatabaseManager([]);
      }
    });
  });
}

function renderDbOptionsArea(db) {
  let optionsHtml = db.fields.map(opt => `
    <li>
      ${opt.value}
      <button class="delete-option-btn" data-id="${opt.id}" style="margin-left:8px;">Delete</button>
    </li>
  `).join('');
  let addOptionHtml = `
    <input type="text" id="new-option-value" placeholder="Add new option">
    <button id="add-option-btn">Add</button>
    <span class="error" id="option-error" style="margin-left:10px;"></span>
  `;
  $('#db-options-area').html(`
    <h3>Options for: ${db.name} ${db.is_multiselect ? '(Multi-select)' : '(Single-select)'}</h3>
    <ul id="option-list">${optionsHtml}</ul>
    <div style="margin-top:10px;">${addOptionHtml}</div>
  `);
  // Add option handler
  $('#add-option-btn').off('click').on('click', function() {
    const value = $('#new-option-value').val().trim();
    if (!value) {
      $('#option-error').text('Value required');
      return;
    }
    // Check for duplicate
    $.get('/option_fields/check', { database_id: db.id, value }, function(resp) {
      if (resp.exists) {
        $('#option-error').text('Option already exists');
      } else {
        // Add option
        $.ajax({
          url: '/option_fields',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ database_id: db.id, value }),
          success: function() {
            // Refresh options
            $.get('/option_databases', function(dbs) {
              const updatedDb = dbs.find(d => d.id == db.id);
              renderDbOptionsArea(updatedDb);
            });
          },
          error: function(xhr) {
            $('#option-error').text(xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Error');
          }
        });
      }
    });
  });
  // Delete option handler
  $('.delete-option-btn').off('click').on('click', function() {
    const optId = $(this).data('id');
    $.ajax({
      url: '/option_fields/' + optId,
      type: 'DELETE',
      success: function() {
        // Refresh options
        $.get('/option_databases', function(dbs) {
          const updatedDb = dbs.find(d => d.id == db.id);
          renderDbOptionsArea(updatedDb);
        });
      }
    });
  });
  // Real-time duplicate check
  $('#new-option-value').off('input').on('input', function() {
    const value = $(this).val().trim();
    if (!value) {
      $('#option-error').text('');
      return;
    }
    $.get('/option_fields/check', { database_id: db.id, value }, function(resp) {
      if (resp.exists) {
        $('#option-error').text('Option already exists');
      } else {
        $('#option-error').text('');
      }
    });
  });
}

// ... existing code ...
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
// ... existing code ...