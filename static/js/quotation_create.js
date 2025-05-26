// Version v1.2.81
// Ensure our popup implementation is used
window.showCustomPopup = undefined; // Clear any existing implementation
if (typeof showCustomPopup !== 'function') {
  // Remove any existing popup styles
  $('#popup-center-toast-style').remove();
  // Add our dedicated CSS class for the popup
  const style = document.createElement('style');
  style.id = 'popup-center-toast-style';
  style.innerHTML = `
    #global-popup-container {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      pointer-events: none !important;
      z-index: 999999 !important;
    }
    .popup-success {
      position: relative !important;
      min-width: 280px !important;
      max-width: 90vw !important;
      padding: 18px 32px !important;
      font-size: 1.2rem !important;
      text-align: center !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
      border: 2px solid #c3e6cb !important;
      background: #d4edda !important;
      color: #155724 !important;
      pointer-events: none !important;
    }
    .popup-success.popup-error {
      border: 2px solid #f5c6cb !important;
      background: #f8d7da !important;
      color: #721c24 !important;
    }
  `;
  document.head.appendChild(style);

  // Remove any existing popup containers
  $('#global-popup-container').remove();
  
  function ensurePopupContainer() {
    if ($('#global-popup-container').length === 0) {
      $('body').append('<div id="global-popup-container"></div>');
    }
  }

  window.showCustomPopup = function(message, isError) {
    ensurePopupContainer();
    // Remove any existing popup
    $('.popup-success').remove();
    $('#global-popup-container').html(`
      <div class="popup-success${isError ? ' popup-error' : ''}">${message}</div>
    `);
    setTimeout(() => {
      $('.popup-success').fadeOut(500, function() { $(this).remove(); });
    }, 1500);
  };
}

// Only attach the handler for Quotation Create button once, and do not globally override anything else
$(function() {
  // Make sure userPermissionLevel is defined, if not, get it
  if (typeof userPermissionLevel === 'undefined') {
    // Check for checkUserPermission function
    if (typeof checkUserPermission === 'function') {
      checkUserPermission(function(level) {
        window.userPermissionLevel = level;
      });
    } else {
      // Default to level 1 if no permission check function exists
      window.userPermissionLevel = 1;
    }
  }
  
  $(document).off('click.quotationCreate').on('click.quotationCreate', '#btn-quotation-create', function() {
    showQuotationCreateForm();
  });
  
  // Quotation 2 button handler
  $(document).off('click.quotationCreate2').on('click.quotationCreate2', '#btn-quotation2-create2', function() {
    showQuotationCreateForm2();
  });

  // Toggle Quotation 2 nested menu
  $('#btn-quotation2').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $('#quotation2-nested').toggle();
  });

  // Handle form submission using event delegation
  let isSubmitting = false;  // Add submission lock flag

  $(document).off('submit.quotation2form').on('submit.quotation2form', '#quotation2-create2-form', function(e) {
    e.preventDefault();
    if (window.isSubmittingQuotation2) return;
    window.isSubmittingQuotation2 = true;
    var $submitBtn = $(this).find('button[type="submit"]');
    $submitBtn.prop('disabled', true)
      .css({
        'background': '#ccc',
        'color': '#888',
        'border': '1.5px solid #bbb'
      });
    
    let formIsValid = true;

    // Validate Company
    const companyInput = $('#quotation2-company-input');
    const companyId = $('#quotation2-company-id').val();
    if (!companyId) {
        formIsValid = false;
        companyInput.css('border-color', 'red');
    } else {
        companyInput.css('border-color', ''); // Reset border
    }

    // Validate Key Person
    const keyPersonSelect = $('#quotation2-keyperson');
    const keyPersonIdx = keyPersonSelect.val();
    const company = customers.find(c => c.id == companyId);
    let keyPerson = null;
    if (company && Array.isArray(company.keyPeople) && keyPersonIdx !== "" && keyPersonIdx >= 0 && keyPersonIdx < company.keyPeople.length) {
        keyPerson = company.keyPeople[keyPersonIdx];
    }

    if (!keyPerson || !keyPerson.id) {
        formIsValid = false;
        keyPersonSelect.css('border-color', 'red');
    } else {
        keyPersonSelect.css('border-color', ''); // Reset border
    }

    // Validate dynamic fields and gather attributes
    const attributes = {};
    
    $('#quotation2-dynamic-fields').find('input:visible:enabled, select:visible:enabled').each(function() {
      const name = $(this).attr('name');
      const value = $(this).val();
      
      if (name && !value) {
         formIsValid = false;
         $(this).css('border-color', 'red');
      } else if (name) {
          // Convert field names to match the backend expectations
          let attributeName = name;
          if (name === 'flatOrRaised') attributeName = 'flat_or_raised';
          if (name === 'directOrReverse') attributeName = 'direct_or_reverse';
          if (name === 'numColors') attributeName = 'num_colors';
          attributes[attributeName] = value;
          $(this).css('border-color', '');
      }
    });

    // Check dynamic color name fields specifically as they are added dynamically
    const colorNames = [];
    $('#color-names-group input[type="text"]').each(function() {
        const value = $(this).val();
        if (!value) {
            formIsValid = false;
            $(this).css('border-color', 'red');
        } else {
            colorNames.push(value);
            $(this).css('border-color', '');
        }
    });
    attributes['color_names'] = colorNames;

    // Additional validation for Silicon + Raised combination
    if (attributes.quality === 'Silicon' && attributes.flat_or_raised === 'Raised' && !attributes.thickness) {
        formIsValid = false;
        $('#ht-thickness').css('border-color', 'red');
    }

    // Ensure artwork image is present (HT form only)
    var fileInput = document.getElementById('q2-jpg-input');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      showCustomPopup('Please upload an artwork image (JPG/PNG/screenshot) before submitting.', true);
      document.getElementById('q2-drop-area').style.borderColor = 'red';
      $submitBtn.prop('disabled', false)
        .css({
          'background': '',
          'color': '',
          'border': ''
        });
      window.isSubmittingQuotation2 = false;
      return;
    } else {
      document.getElementById('q2-drop-area').style.borderColor = '#aaa';
    }

    // If form is not valid, show the single alert and stop submission
    if (!formIsValid) {
        showCustomPopup('Please fill in below highlight in red border fill', true);
        $submitBtn.prop('disabled', false)
          .css({
            'background': '',
            'color': '',
            'border': ''
          });
        return;
    }

    // Prepare FormData for file upload
    var formData = new FormData(this);
    // Always get the file from the file input
    var fileInput = document.getElementById('q2-jpg-input');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('artwork_image', fileInput.files[0]);
    }
    // Add other fields manually if needed
    formData.append('customer_name', company ? company.company : '');
    formData.append('key_person_name', keyPerson ? keyPerson.name : '');
    formData.append('customer_item_code', $('#customer-item-code').val());
    formData.append('customer_id', company ? company.id : '');
    formData.append('key_person_id', keyPerson ? keyPerson.id : '');
    formData.append('quality', $('#ht-quality').val());
    formData.append('flat_or_raised', $('#ht-flat-or-raised').val());
    formData.append('direct_or_reverse', $('#ht-direct-or-reverse').val());
    formData.append('thickness', parseFloat($('#ht-thickness').val()) || 0);
    formData.append('num_colors', parseInt($('#ht-num-colors').val()) || 0);
    formData.append('width', parseFloat($('#ht-width').val()) || 0);
    formData.append('length', parseFloat($('#ht-length').val()) || 0);
    // Add color names as JSON string
    formData.append('color_names', JSON.stringify(colorNames));
    // Get CSRF token from meta tag
    const csrfToken = $('meta[name="csrf-token"]').attr('content');
    $.ajax({
      url: '/quotation/save',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrfToken
      },
      xhrFields: {
        withCredentials: true
      },
      success: function(response) {
        if (response.error) {
          showCustomPopup('Error: ' + response.error, true);
          $submitBtn.prop('disabled', false)
            .css({
              'background': '',
              'color': '',
              'border': ''
            });
        } else {
          showCustomPopup('Quotation saved successfully', false);
          setTimeout(() => {
            $('#right-frame').load('/view_quotations_simple');
          }, 1000);
        }
      },
      error: function(xhr, status, error) {
        let errorMsg = 'Error saving quotation';
        try {
          if (xhr.responseJSON && xhr.responseJSON.error) {
            errorMsg += ': ' + xhr.responseJSON.error;
          } else if (xhr.responseText) {
            errorMsg += ': ' + xhr.responseText;
          } else {
            errorMsg += ': ' + error;
          }
        } catch(e) {
          errorMsg += ': ' + error;
        }
        showCustomPopup(errorMsg, true);
        console.error('Save error:', xhr, status, error);
        $submitBtn.prop('disabled', false)
          .css({
            'background': '',
            'color': '',
            'border': ''
          });
      },
      complete: function() {
        window.isSubmittingQuotation2 = false;
      }
    });
  });

  $(document).off('click.htDatabase').on('click.htDatabase', '#btn-ht-database', function() {
    // Load the Heat Transfer Database HTML into the right-frame
    $.get('/ht_database', function(data) {
      $('#right-frame').html(data);
      // Dynamically reload ht_database.js after HTML is injected
      var script = document.createElement('script');
      script.src = '/static/js/ht_database.js';
      script.onload = function() {
        // Optionally, you can call loadHtData() here if needed
      };
      document.body.appendChild(script);
    });
  });

  // Attach Item Code Generate button handler
  $('#generate-item-code-btn').off('click').on('click', function(e) {
    e.preventDefault();
    fetch('/quotation/generate_code')
      .then(response => response.json())
      .then(data => {
        $('#customer-item-code').val(data.code);
      });
  });
});

function showQuotationCreateForm() {
  // Render a blank form for quotation creation
  const productTypeFields = {
    "heat transfer": [
      { name: "quality", label: "Quality", type: "select", options: ["PU", "Silicon"] },
      { name: "flatOrRaised", label: "Flat or Raised", type: "select", options: ["Flat", "Raised"] },
      { name: "directOrReverse", label: "Direct or Reverse", type: "select", options: ["Direct", "Reverse"] },
      { name: "thickness", label: "Thickness", type: "number" },
      { name: "numColors", label: "# of Colors", type: "number" },
      { name: "colorNames", label: "Color Names", type: "dynamic" },
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
      { name: "directOrReverse", label: "Direct or Reverse", type: "select", options: ["Direct", "Reverse"] },
      { name: "thickness", label: "Thickness", type: "number" }
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
  // Render dynamic fields blank
  $('#quotation-product-type').on('change', function() {
    renderDynamicFieldsBlank(productTypeFields);
  });
  renderDynamicFieldsBlank(productTypeFields); // Initial blank render

  // --- Customer Selection Logic ---

  let currentFocus = -1;

  // Function to update suggestion list
  function updateSuggestions(val = '') {
    val = val.toLowerCase();
    let matches = val ? 
      customers.filter(c => c.company.toLowerCase().includes(val)) :
      customers;
    
    const $suggestionList = $('#company-suggestions ul'); // Use #company-suggestions
    if (matches.length) {
      const html = matches.map(c => 
        `<li data-id="${c.id}" style="padding: 8px 12px; cursor: pointer; list-style: none; border-bottom: 1px solid #eee;">${c.company}</li>`
      ).join('');
      $suggestionList.html(html).show();
      currentFocus = -1; // Reset focus when updating list
    } else {
      $suggestionList.hide();
    }
  }

  // Function to select company
  function selectCompany(id) {
    const company = customers.find(c => c.id == id);
    if (company) {
      $('#quotation-company-input').val(company.company); // Use #quotation-company-input
      $('#quotation-company-id').val(company.id); // Use #quotation-company-id
      $('#company-suggestions ul').hide(); // Use #company-suggestions
      // Mark as selected
      $('#quotation-company-input').attr('data-selected', 'true');

      // Populate key people
      let kpOpts = '<option value="">-- Select Key Person --</option>';
      if (Array.isArray(company.keyPeople)) {
        kpOpts += company.keyPeople.map((kp, idx) => `<option value="${idx}">${kp.name} (${kp.position})</option>`).join('');
      }
      $('#quotation-keyperson').html(kpOpts); // Use #quotation-keyperson
    }
  }

  // Show companies only when typing or when field is empty
  $('#quotation-company-input').on('focus click', function(e) { // Use #quotation-company-input
    // Don't show list if company is already selected
    if ($(this).attr('data-selected') === 'true') {
      return;
    }
    updateSuggestions();
  });

  // Filter companies as user types
  $('#quotation-company-input').on('input', function() { // Use #quotation-company-input
    const val = $(this).val();
    // Remove selected state when user starts typing
    $(this).attr('data-selected', 'false');
    updateSuggestions(val);
  });

  // Handle keyboard navigation
  $('#quotation-company-input').on('keydown', function(e) { // Use #quotation-company-input
    const $suggestions = $('#company-suggestions ul'); // Use #company-suggestions
    const $items = $suggestions.find('li');
    
    if (!$items.length) return;

    // Down arrow
    if (e.keyCode === 40) {
      currentFocus++;
      if (currentFocus >= $items.length) currentFocus = 0;
      $items.removeClass('active').css('background-color', '');
      $items.eq(currentFocus).addClass('active').css('background-color', '#f0f0f0');
      // Scroll into view if needed
      const activeItem = $items[currentFocus];
      if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
    }
    // Up arrow
    else if (e.keyCode === 38) {
      currentFocus--;
      if (currentFocus < 0) currentFocus = $items.length - 1;
      $items.removeClass('active').css('background-color', '');
      $items.eq(currentFocus).addClass('active').css('background-color', '#f0f0f0');
      // Scroll into view if needed
      const activeItem = $items[currentFocus];
      if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
    }
    // Enter
    else if (e.keyCode === 13 && currentFocus > -1) {
      e.preventDefault(); // Prevent form submission
      const id = $items.eq(currentFocus).data('id');
      selectCompany(id);
    }
    // Escape
    else if (e.keyCode === 27) {
      $suggestions.hide();
      currentFocus = -1;
    }
  });

  // Handle company selection by click
  $('#company-suggestions').on('click', 'li', function() { // Use #company-suggestions
    const id = $(this).data('id');
    selectCompany(id);
  });

  // Handle mouse hover on suggestions
  $('#company-suggestions').on('mouseover', 'li', function() { // Use #company-suggestions
    const $items = $('#company-suggestions ul li'); // Use #company-suggestions
    $items.removeClass('active').css('background-color', '');
    $(this).addClass('active').css('background-color', '#f0f0f0');
    currentFocus = $items.index(this);
  });

  // Hide suggestions when clicking outside
  $(document).on('click', function(e) {
    if (!$(e.target).closest('#quotation-company-input, #company-suggestions').length) { // Use #quotation-company-input, #company-suggestions
      $('#company-suggestions ul').hide(); // Use #company-suggestions
      currentFocus = -1;
    }
  });

  // --- End Customer Selection Logic ---
}

function renderDynamicFieldsBlank(productTypeFields) {
  const type = $('#quotation-product-type').val();
  const fields = productTypeFields[type] || [];
  let html = '';
  fields.forEach(field => {
    if (field.type === 'select') {
      html += `<label>${field.label}:<br><select name="${field.name}"><option value="">-- Select --</option>${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select></label><br>`;
    } else if (field.type === 'number' && field.name !== 'numColors') {
      html += `<label>${field.label}:<br><input type="number" name="${field.name}" min="0" value=""></label><br>`;
    } else if (field.type === 'text') {
      html += `<label>${field.label}:<br><input type="text" name="${field.name}" value=""></label><br>`;
    } else if (field.type === 'dynamic' && field.name === 'colorNames') {
      html += `<label># of Colors:</label><div class="color-group"><input type="number" name="numColors" min="1" value="1" style="width: 95%; margin-bottom: 1em;"></div><label>Color Names:</label><div class="color-names-indent">`;
      html += `<input type="text" name="colorName1" placeholder="Color 1" value="" style="width: 95%; margin-bottom: 0.5em;">`;
      html += `</div><br>`;
    }
  });
  $('#quotation-dynamic-fields').html(html);
  $('#quotation-dynamic-fields [name="numColors"]').off('input').on('input', function() {
    renderDynamicFieldsBlank(productTypeFields);
  });
}

function showQuotationCreateForm2() {
  // First fetch customers for company search and check permission level
  fetchCustomers(function() {
    // Get the user permission level
    $.get('/check_permission', function(response) {
      const userLevel = response.level || 0;
      
      $('#right-frame').html(`
        <div style="padding:32px;max-width:900px; min-height:100vh;">
          <h2>Create Quotation (HT) <span style='font-size:1rem;color:#888;'>v1.2.81</span></h2>
          <div style="display:flex; gap:32px; align-items:flex-start;">
            <div style="flex:2; min-width:340px;">
              ${userLevel >= 3 ? `
              <!-- DATABASE BUTTON - ONLY FOR LEVEL 3 USERS -->
              <div style="background-color: #f0f8ff; border: 2px solid #4a90e2; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: center;">
                <button id="btn-ht-database" type="button" style="background-color: #4a90e2; color: white; font-size: 18px; padding: 10px 30px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                  DATABASE
                </button>
                <div style="margin-top: 8px; font-size: 12px; color: #666;">Access HT Database (Level 3 users only)</div>
              </div>
              ` : ''}
              <form id="quotation2-create2-form" autocomplete="off">
                <!-- Customer Details Section -->
                <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 16px 0; color: #495057; font-size: 1.1em;">Customer Details</h3>
                  <label>Company:<br>
                    <input type="text" id="quotation2-company-input" placeholder="Type to search or select..." autocomplete="off" style="width: 100%; padding: 8px; margin-bottom: 4px;">
                    <div id="company2-suggestions" style="position: relative;">
                      <ul style="display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: white; border: 1px solid #ccc; border-radius: 4px; margin: 0; padding: 0; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></ul>
                    </div>
                    <input type="hidden" id="quotation2-company-id">
                  </label><br><br>
                  <label>Key Person:<br>
                    <select id="quotation2-keyperson" style="width: 100%; padding: 8px;">
                      <option value="">-- Select Key Person --</option>
                    </select>
                  </label>
                </div>
                <!-- Item Information Section -->
                <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px;">
                  <h3 style="margin: 0 0 16px 0; color: #495057; font-size: 1.1em;">Item Information</h3>
                  <!-- Dummy Button -->
                  <button type="button" id="dummy-fill-btn" style="position: fixed; top: 20px; right: 20px; padding: 8px 20px; background-color: #ccc; color: #000; border: none; border-radius: 4px; cursor: pointer; z-index: 1000;">Dummy Fill</button>
                  <div id="quotation2-dynamic-fields">
                    <label>Item Code:<br>
                      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <input type="text" id="customer-item-code" name="customer_item_code" style="flex: 1; padding: 8px;">
                        <button type="button" id="generate-item-code-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Generate</button>
                      </div>
                    </label>
                    <label>Quality:<br>
                      <select id="ht-quality" name="quality" style="width: 100%; padding: 8px;">
                        <option value="">-- Select --</option>
                        <option value="PU">PU</option>
                        <option value="Silicon">Silicon</option>
                      </select>
                    </label><br><br>
                    <label>Flat or Raised:<br>
                      <select id="ht-flat-or-raised" name="flatOrRaised" style="width: 100%; padding: 8px;" disabled>
                        <option value="">-- Select --</option>
                        <option value="Flat">Flat</option>
                        <option value="Raised">Raised</option>
                      </select>
                    </label><br><br>
                    <label>Direct or Reverse:<br>
                      <select id="ht-direct-or-reverse" name="directOrReverse" style="width: 100%; padding: 8px;" disabled>
                        <option value="">-- Select --</option>
                        <option value="Direct">Direct</option>
                        <option value="Reverse">Reverse</option>
                      </select>
                    </label><br><br>
                    <label>Thickness 0.1-1.5:<br>
                      <input type="number" id="ht-thickness" name="thickness" min="0.1" max="1.5" step="0.1" style="width: 100%; padding: 8px;" disabled>
                    </label><br><br>
                    <label># of Colors:<br>
                      <input type="number" id="ht-num-colors" name="numColors" min="1" step="1" style="width: 100%; padding: 8px;" autocomplete="off" placeholder="" />
                    </label>
                    <div id="color-names-group" style="margin-top: 10px;"></div>
                    <label>Width:<br>
                      <input type="number" id="ht-width" name="width" min="0" style="width: 100%; padding: 8px; margin-top: 16px; border: 1.5px solid #b3c6ff; border-radius: 4px;">
                    </label><br><br>
                    <label>Length:<br>
                      <input type="number" id="ht-length" name="length" min="0" style="width: 100%; padding: 8px;">
                    </label>
                  </div>
                </div>
                <br>
                <!-- Submit button at the bottom -->
                <button type="submit" style="padding:8px 32px; width: 100%; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">Submit</button>
              </form>
            </div>
            <div style="flex:1; min-width:220px; max-width:320px; margin-top:0;">
              <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px;">
                <label style="font-weight:bold;">Upload JPG/PNG Artwork:<br><span style='font-weight:normal;font-size:13px;color:#888;'>(Drag & drop, click, or <b>Ctrl+V</b> to paste JPG/PNG or screenshot)</span></label>
                <div id="q2-drop-area" style="border:2px dashed #aaa; border-radius:8px; padding:24px; text-align:center; background:#fafbfc; color:#888; cursor:pointer;">
                  <span id="q2-drop-label">Drag & drop JPG/PNG here or click to select</span>
                  <input type="file" id="q2-jpg-input" accept=".jpg,.jpeg" style="display:none;" />
                  <div id="q2-jpg-preview" style="margin-top:12px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);

      // Initialize HT form fields
      const $quality = $('#ht-quality');
      const $flatOrRaised = $('#ht-flat-or-raised');
      const $directOrReverse = $('#ht-direct-or-reverse');
      const $thickness = $('#ht-thickness');

      // Function to reset fields to default state
      function resetFields() {
        $quality.val('').prop('disabled', false);
        $flatOrRaised.val('').prop('disabled', true);
        $directOrReverse.val('').prop('disabled', true);
        $thickness.val('').prop('disabled', true);
      }

      // Initial reset
      resetFields();

      // L1 (Quality) change handler
      $quality.on('change', function() {
        const selectedQuality = $(this).val();
        // Reset lower levels
        $flatOrRaised.val('').prop('disabled', true);
        $directOrReverse.val('').prop('disabled', true);
        $thickness.val('').prop('disabled', true);

        if (selectedQuality === 'PU') {
          // For PU: Force Flat and Direct
          $flatOrRaised.val('Flat').prop('disabled', true);
          $directOrReverse.val('Direct').prop('disabled', true);
        } else if (selectedQuality === 'Silicon') {
          // For Silicon: Enable Flat or Raised selection
          $flatOrRaised.val('').prop('disabled', false);
          $directOrReverse.val('').prop('disabled', true);
          $thickness.val('').prop('disabled', true);
        }
      });

      // L2 (Flat or Raised) change handler
      $flatOrRaised.on('change', function() {
        const selectedFlatOrRaised = $(this).val();
        const selectedQuality = $quality.val();
        // Reset lower levels
        $directOrReverse.val('').prop('disabled', true);
        $thickness.val('').prop('disabled', true);

        if (selectedQuality === 'Silicon') {
          if (selectedFlatOrRaised === 'Flat') {
            // For Flat: Force Direct, disable L3, disable L4
            $directOrReverse.val('Direct').prop('disabled', true);
            $thickness.val('').prop('disabled', true);
          } else if (selectedFlatOrRaised === 'Raised') {
            // For Raised: Enable Direct or Reverse, enable L4
            $directOrReverse.val('').prop('disabled', false);
            $thickness.val('').prop('disabled', false);
          }
        } else if (selectedQuality === 'PU') {
          // For PU: already handled in L1
          $directOrReverse.val('Direct').prop('disabled', true);
          $thickness.val('').prop('disabled', true);
        }
      });

      // L3 (Direct or Reverse) change handler
      $directOrReverse.on('change', function() {
        const selectedDirectOrReverse = $(this).val();
        const selectedFlatOrRaised = $flatOrRaised.val();
        const selectedQuality = $quality.val();
        // Reset L4
        $thickness.val('').prop('disabled', true);
        // Enable thickness only for Silicon + Raised combination
        if (selectedQuality === 'Silicon' && selectedFlatOrRaised === 'Raised') {
          $thickness.prop('disabled', false);
        }
      });

      // L4 (Thickness) validation
      $thickness.on('input', function() {
        const value = parseFloat($(this).val());
        if (value < 0.1 || value > 1.5) {
          $(this).css('border-color', 'red');
        } else {
          $(this).css('border-color', '');
        }
      });

      let currentFocus = -1;

      // Function to update suggestion list
      function updateSuggestions(val = '') {
        val = val.toLowerCase();
        let matches = val ? 
          customers.filter(c => c.company.toLowerCase().includes(val)) :
          customers;
        
        const $suggestionList = $('#company2-suggestions ul');
        if (matches.length) {
          const html = matches.map(c => 
            `<li data-id="${c.id}" style="padding: 8px 12px; cursor: pointer; list-style: none; border-bottom: 1px solid #eee;">${c.company}</li>`
          ).join('');
          $suggestionList.html(html).show();
          currentFocus = -1; // Reset focus when updating list
        } else {
          $suggestionList.hide();
        }
      }

      // Function to select company
      function selectCompany(id) {
        const company = customers.find(c => c.id == id);
        if (company) {
          $('#quotation2-company-input').val(company.company);
          $('#quotation2-company-id').val(company.id);
          $('#company2-suggestions ul').hide();
          // Mark as selected
          $('#quotation2-company-input').attr('data-selected', 'true');

          // Populate key people
          let kpOpts = '<option value="">-- Select Key Person --</option>';
          if (Array.isArray(company.keyPeople)) {
            kpOpts += company.keyPeople.map((kp, idx) => `<option value="${idx}">${kp.name} (${kp.position})</option>`).join('');
          }
          $('#quotation2-keyperson').html(kpOpts);
        }
      }

      // Show companies only when typing or when field is empty
      $('#quotation2-company-input').on('focus click', function(e) {
        // Don't show list if company is already selected
        if ($(this).attr('data-selected') === 'true') {
          return;
        }
        updateSuggestions();
      });

      // Filter companies as user types
      $('#quotation2-company-input').on('input', function() {
        const val = $(this).val();
        // Remove selected state when user starts typing
        $(this).attr('data-selected', 'false');
        updateSuggestions(val);
      });

      // Handle keyboard navigation
      $('#quotation2-company-input').on('keydown', function(e) {
        const $suggestions = $('#company2-suggestions ul');
        const $items = $suggestions.find('li');
        
        if (!$items.length) return;

        // Down arrow
        if (e.keyCode === 40) {
          currentFocus++;
          if (currentFocus >= $items.length) currentFocus = 0;
          $items.removeClass('active').css('background-color', '');
          $items.eq(currentFocus).addClass('active').css('background-color', '#f0f0f0');
          // Scroll into view if needed
          const activeItem = $items[currentFocus];
          if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
        }
        // Up arrow
        else if (e.keyCode === 38) {
          currentFocus--;
          if (currentFocus < 0) currentFocus = $items.length - 1;
          $items.removeClass('active').css('background-color', '');
          $items.eq(currentFocus).addClass('active').css('background-color', '#f0f0f0');
          // Scroll into view if needed
          const activeItem = $items[currentFocus];
          if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
        }
        // Enter
        else if (e.keyCode === 13 && currentFocus > -1) {
          e.preventDefault(); // Prevent form submission
          const id = $items.eq(currentFocus).data('id');
          selectCompany(id);
        }
        // Escape
        else if (e.keyCode === 27) {
          $suggestions.hide();
          currentFocus = -1;
        }
      });

      // Handle company selection by click
      $('#company2-suggestions').on('click', 'li', function() {
        const id = $(this).data('id');
        selectCompany(id);
      });

      // Handle mouse hover on suggestions
      $('#company2-suggestions').on('mouseover', 'li', function() {
        const $items = $('#company2-suggestions ul li');
        $items.removeClass('active').css('background-color', '');
        $(this).addClass('active').css('background-color', '#f0f0f0');
        currentFocus = $items.index(this);
      });

      // Hide suggestions when clicking outside
      $(document).on('click', function(e) {
        if (!$(e.target).closest('#quotation2-company-input, #company2-suggestions').length) {
          $('#company2-suggestions ul').hide();
          currentFocus = -1;
        }
      });

      // Drag and drop logic for JPG/PNG
      const dropArea = document.getElementById('q2-drop-area');
      const fileInput = document.getElementById('q2-jpg-input');
      const previewDiv = document.getElementById('q2-jpg-preview');
      let jpgFile = null;
      dropArea.addEventListener('click', () => fileInput.click());
      dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.style.background = '#e3e7ea'; });
      dropArea.addEventListener('dragleave', e => { e.preventDefault(); dropArea.style.background = '#fafbfc'; });
      dropArea.addEventListener('drop', e => {
        e.preventDefault();
        dropArea.style.background = '#fafbfc';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFile(e.dataTransfer.files[0], true);
        }
      });
      fileInput.addEventListener('change', e => {
        if (fileInput.files && fileInput.files[0]) {
          handleImageFile(fileInput.files[0], false);
        }
      });
      // --- Add paste (Ctrl+V) support for JPG/PNG image ---
      const rightFrame = document.getElementById('right-frame');
      function handlePasteEvent(e) {
        if (document.getElementById('q2-drop-area')) {
          if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
              const item = e.clipboardData.items[i];
              if (item.kind === 'file' && (item.type === 'image/jpeg' || item.type === 'image/png')) {
                const file = item.getAsFile();
                handleImageFile(file, true);
                e.preventDefault();
                break;
              }
            }
          }
        }
      }
      rightFrame.addEventListener('paste', handlePasteEvent);
      $(rightFrame).one('DOMNodeRemoved', function() {
        rightFrame.removeEventListener('paste', handlePasteEvent);
      });
      // --- End paste support ---
      async function handleImageFile(file, fromDrop) {
        if (!(file.type === 'image/jpeg' || file.type === 'image/png')) {
          previewDiv.innerHTML = '<span style="color:red;">Only JPG or PNG files are allowed.</span>';
          jpgFile = null;
          return;
        }
        // If PNG, convert to JPG using canvas
        if (file.type === 'image/png') {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(function(blob) {
              if (!blob) {
                previewDiv.innerHTML = '<span style="color:red;">Failed to convert PNG to JPG.</span>';
                jpgFile = null;
                return;
              }
              const jpg = new File([blob], 'artwork.jpg', { type: 'image/jpeg' });
              setJpgFile(jpg, fromDrop, canvas.toDataURL('image/jpeg'));
            }, 'image/jpeg', 0.92);
          };
          img.onerror = function() {
            previewDiv.innerHTML = '<span style="color:red;">Failed to load PNG image.</span>';
            jpgFile = null;
          };
          img.src = URL.createObjectURL(file);
        } else {
          // JPG: preview and set
          const reader = new FileReader();
          reader.onload = function(e) {
            setJpgFile(file, fromDrop, e.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
      function setJpgFile(file, fromDrop, dataUrl) {
        jpgFile = file;
        if ((fromDrop || fileInput) && fileInput) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
        }
        previewDiv.innerHTML = `<img src="${dataUrl}" style="max-width:180px;max-height:120px;border:1px solid #ccc;border-radius:6px;" />`;
      }
      window.q2_jpgFile = jpgFile;

      // --- Dynamic Color Names logic for # of Colors ---
      function renderColorNames(num, prevVals) {
        let html = '';
        for (let i = 0; i < num; i++) {
          const cname = prevVals['colorName'+(i+1)] || '';
          html += `<input type="text" name="colorName${i+1}" placeholder="Color ${i+1}" value="${cname}"><br>`;
        }
        return html;
      }
      function getPrevColorNames() {
        const prev = {};
        $('#color-names-group input[type="text"]').each(function(i) {
          prev['colorName'+(i+1)] = $(this).val();
        });
        return prev;
      }
      // Set default # of Colors to 1 on form load
      $('#ht-num-colors').val(1);
      // Render color name fields on # of Colors change
      $('#quotation2-dynamic-fields').on('input', '#ht-num-colors', function() {
        const prevVals = getPrevColorNames();
        let num = parseInt($(this).val(), 10) || 0;
        if (num < 1) num = 1;
        let html = renderColorNames(num, prevVals);
        $('#color-names-group').html(html);
      });
      // Initial render (preserve on reload)
      setTimeout(function() {
        $('#ht-num-colors').val(1); // Always default to 1
        const prevVals = getPrevColorNames();
        let num = 1;
        $('#color-names-group').html(renderColorNames(num, prevVals));
      }, 0);
      // Dummy Fill Button Handler
      $('#dummy-fill-btn').off('click').on('click', function() {
        // Reset all color name fields to blank and # of Colors to 1
        $('#ht-num-colors').val(1);
        $('#color-names-group').html(renderColorNames(1, {}));
        // Random dummy data
        const qualities = ['PU', 'Silicon'];
        const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Purple', 'Orange', 'Pink', 'Brown'];
        const numColors = Math.floor(Math.random() * 3) + 1; // 1-3 colors
        const width = Math.floor(Math.random() * 200) + 50; // 50-250
        const length = Math.floor(Math.random() * 300) + 100; // 100-400
        // Select a random company and key person if customers data is available
        if (typeof customers !== 'undefined' && customers.length > 0) {
          const randomCompany = customers[Math.floor(Math.random() * customers.length)];
          // Set company
          $('#quotation2-company-input').val(randomCompany.company);
          $('#quotation2-company-id').val(randomCompany.id);
          $('#quotation2-company-input').attr('data-selected', 'true');
          // Populate key people
          let kpOpts = '<option value="">-- Select Key Person --</option>';
          if (Array.isArray(randomCompany.keyPeople)) {
            kpOpts += randomCompany.keyPeople.map((kp, idx) => `<option value="${idx}">${kp.name} (${kp.position})</option>`).join('');
          }
          $('#quotation2-keyperson').html(kpOpts);
          // Select a random key person
          if (Array.isArray(randomCompany.keyPeople) && randomCompany.keyPeople.length > 0) {
            const randomIdx = Math.floor(Math.random() * randomCompany.keyPeople.length);
            $('#quotation2-keyperson').val(randomIdx);
          }
        }
        // Fill Item Code (fetch from backend)
        fetch('/quotation/generate_code')
          .then(response => response.json())
          .then(data => {
            $('#customer-item-code').val(data.code);
          });
        // Fill Quality
        const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
        $('#ht-quality').val(randomQuality).trigger('change');
        // Fill Flat/Raised
        setTimeout(function() {
          const flatOrRaised = ['Flat', 'Raised'][Math.floor(Math.random() * 2)];
          $('#ht-flat-or-raised').val(flatOrRaised).trigger('change');
          // Fill Direct/Reverse
          setTimeout(function() {
            const directOrReverse = ['Direct', 'Reverse'][Math.floor(Math.random() * 2)];
            $('#ht-direct-or-reverse').val(directOrReverse).trigger('change');
            // Fill Thickness if enabled
            if (!$('#ht-thickness').prop('disabled')) {
              const thickness = (Math.random() * 1.4 + 0.1).toFixed(1); // 0.1-1.5
              $('#ht-thickness').val(thickness);
            }
          }, 100);
        }, 100);
        // Fill Number of Colors
        $('#ht-num-colors').val(numColors).trigger('input');
        setTimeout(function() {
          // Fill Color Names (after input boxes are rendered)
          const shuffledColors = [...colors].sort(() => 0.5 - Math.random());
          $('#color-names-group input[type="text"]').each(function(i) {
            $(this).val(shuffledColors[i % shuffledColors.length]);
          });
        }, 200);
        // Fill Width and Length
        $('#ht-width').val(width);
        $('#ht-length').val(length);
      });
    });
  });
}