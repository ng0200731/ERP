// Version v1.2.21
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
  $(document).off('submit.quotation2form').on('submit.quotation2form', '#quotation2-create2-form', function(e) {
    e.preventDefault();
    
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
          attributes[name] = value;
          $(this).css('border-color', '');
      }
    });

    // Check dynamic color name fields specifically as they are added dynamically
    $('#color-names-group input[type="text"]').each(function() {
        const name = $(this).attr('name');
        const value = $(this).val();
        if (name && !value) {
            formIsValid = false;
            $(this).css('border-color', 'red');
        } else if (name) {
             // These are part of colorNames attribute, handled below
             $(this).css('border-color', '');
        }
    });

    // Special handling for colorNames dynamic field value collection
    const numColorsInput = $('#ht-num-colors');
    const numColors = parseInt(numColorsInput.val(), 10);
    if (!isNaN(numColors) && numColors > 0) {
        attributes['colorNames'] = [];
        $('#color-names-group input[type="text"]').each(function() {
            attributes['colorNames'].push($(this).val());
        });
    }

    // If form is not valid, show the single alert and stop submission
    if (!formIsValid) {
        showCustomPopup('Please fill in below highlight in red border fill', true);
        return;
    }

    // Prepare data for saving
    const quotationData = {
        quality: attributes.quality || '',
        flat_or_raised: attributes.flatOrRaised || '',
        direct_or_reverse: attributes.directOrReverse || '',
        thickness: parseFloat(attributes.thickness) || 0,
        num_colors: parseInt(attributes.numColors) || 0,
        length: parseFloat(attributes.length) || 0,
        width: parseFloat(attributes.width) || 0,
        price: parseFloat(attributes.price) || 0
    };

    // Save to SQLite via API
    $.ajax({
        url: '/quotation/save',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(quotationData),
        success: function(response) {
            showCustomPopup('Quotation saved successfully', false);
            // Load view page in right frame after showing success message
            setTimeout(() => {
                $('#right-frame').load('/view_quotations_simple');
            }, 1000);
        },
        error: function(xhr, status, error) {
            showCustomPopup('Error saving quotation: ' + error, true);
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
        <div style="padding:32px;max-width:600px; min-height:100vh;">
          <h2>Create Quotation (HT) <span style='font-size:1rem;color:#888;'>v1.2.21</span></h2>
          
          ${userLevel >= 3 ? `
          <!-- DATABASE BUTTON - ONLY FOR LEVEL 3 USERS -->
          <div style="background-color: #f0f8ff; border: 2px solid #4a90e2; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: center;">
            <button id="btn-ht-database" type="button" style="background-color: #4a90e2; color: white; font-size: 18px; padding: 10px 30px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
              DATABASE
            </button>
          </div>
          ` : ''}
          
          <style>\
            #quotation2-create2-form input[type="number"],\
            #quotation2-create2-form input[type="text"],\
            #quotation2-create2-form select {\
              width: 100% !important;\
              box-sizing: border-box;\
              padding: 8px;\
              border-radius: 4px;\
              border: 1.5px solid #b3c6ff;\
              margin-bottom: 8px;\
            }\
            #quotation2-create2-form label {\
              margin-bottom: 4px;\
              display: block;\
            }\
          </style>
          
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
        <script>
        $(function() {
          function updateHTForm(triggeredBy) {
            var quality = $('#ht-quality').val();
            var flatOrRaised = $('#ht-flat-or-raised').val();
            var directOrReverse = $('#ht-direct-or-reverse');
            var thickness = $('#ht-thickness');

            // Handle Quality (L1) changes - Reset everything to default select
            if (triggeredBy === 'quality') {
              // First, clear all options and reset to default select
              directOrReverse.empty();
              directOrReverse.append('<option value="">-- Select --</option>');
              
              // Reset all fields to default select state
              $('#ht-flat-or-raised').val('').prop('disabled', true);
              directOrReverse.val('').prop('disabled', true);
              thickness.val('').prop('disabled', true);

              if (quality === 'PU') {
                // PU selected - Set defaults
                $('#ht-flat-or-raised').val('Flat').prop('disabled', true);
                directOrReverse.append('<option value="Direct">Direct</option>');
                directOrReverse.val('Direct').prop('disabled', true);
                thickness.prop('disabled', true);
              } else if (quality === 'Silicon') {
                // Silicon selected - Enable L2 only
                $('#ht-flat-or-raised').prop('disabled', false);
                // Add Direct option but don't select it
                directOrReverse.append('<option value="Direct">Direct</option>');
                directOrReverse.prop('disabled', true);
                thickness.prop('disabled', true);
              }
            }

            // Handle Flat/Raised (L2) changes
            if (triggeredBy === 'flatOrRaised') {
              // Reset L3 and L4 to default select
              directOrReverse.empty();
              directOrReverse.append('<option value="">-- Select --</option>');
              directOrReverse.val('').prop('disabled', true);
              thickness.val('').prop('disabled', true);

              if (flatOrRaised === 'Flat') {
                // Flat selected
                directOrReverse.append('<option value="Direct">Direct</option>');
                directOrReverse.val('Direct').prop('disabled', true);
                thickness.prop('disabled', true);
              } else if (flatOrRaised === 'Raised') {
                // Raised selected
                directOrReverse.append('<option value="Direct">Direct</option>');
                directOrReverse.append('<option value="Reverse">Reverse</option>');
                directOrReverse.val('').prop('disabled', false);
                thickness.prop('disabled', false);
              }
            }

            // L3 changes have no effect on other fields
            if (triggeredBy === 'directOrReverse') {
              // No changes needed for other fields
            }
          }

          // Attach event handlers
          $('#ht-quality').on('change', function() { 
            updateHTForm('quality'); 
          });
          
          $('#ht-flat-or-raised').on('change', function() { 
            updateHTForm('flatOrRaised'); 
          });
          
          $('#ht-direct-or-reverse').on('change', function() { 
            updateHTForm('directOrReverse'); 
          });

          // Initial form state
          updateHTForm('quality');

          let lastValidThickness = '';
          // Prevent non-numeric input in thickness field
          $('#ht-thickness').on('keydown', function(e) {
            if (["e", "E", "+", "-"].includes(e.key)) {
              e.preventDefault();
            }
          });
          // Enforce 1 decimal place and range for thickness in real time
          $('#ht-thickness').on('input', function() {
            let val = $(this).val();
            // Remove all but first decimal point
            if (val.split('.').length > 2) {
              val = val.replace(/\.+$/, '');
              $(this).val(val);
            }
            // Only allow 1 decimal place
            if (/^\d+\.\d{2,}$/.test(val)) {
              // Do not auto-correct, just leave as is for warning on blur
            }
          });
          // Clamp to range and fix decimals on blur, warn user if invalid
          $('#ht-thickness').on('focus', function() {
            lastValidThickness = $(this).val();
          });
          $('#ht-thickness').on('blur', function() {
            let val = $(this).val();
            if (val === '') return;
            let num = Number(val);
            // Accept 0.1-0.9, 1, 1.0-1.5 (1 decimal place max)
            if (!/^(0\.[1-9]|1(\.[0-5])?)$/.test(val) || isNaN(num) || num < 0.1 || num > 1.5) {
              showCustomPopup('Thickness must be a number from 0.1 to 1.5 with only 1 decimal place.', true);
              $(this).val(lastValidThickness);
              setTimeout(() => { $(this).focus(); }, 0);
              return;
            }
            // Always format to 1 decimal place
            $(this).val(num.toFixed(1));
            lastValidThickness = $(this).val();
          });

          // Prevent non-numeric input in # of colors field
          $('#ht-num-colors').on('keydown', function(e) {
            if (["e", "E", "+", "-", "."].includes(e.key)) {
              e.preventDefault();
            }
          });

          // Dynamic color name fields logic
          let lastNumColors = 0;
          let colorValues = [];
          // Only update color fields on blur, not on input
          $('#ht-num-colors').off('input');
          $('#ht-num-colors').on('blur', function() {
            let val = $(this).val();
            let num = parseInt(val, 10);
            // Save current color values
            colorValues = [];
            $('#color-names-group input[type="text"]').each(function() {
              colorValues.push($(this).val());
            });
            if (isNaN(num) || num < 1) {
              $('#color-names-group').empty();
              lastNumColors = 0;
              colorValues = [];
              return;
            }
            if (num < lastNumColors) {
              if (!confirm('Reducing the number of colors will remove the last color name field(s). Continue?')) {
                $(this).val(lastNumColors);
                return;
              }
              // Remove the last value(s)
              colorValues = colorValues.slice(0, num);
            }
            lastNumColors = num;
            // Build color name fields, keeping previous values
            let html = '<div style="border: 2px solid #b3c6ff; border-radius: 8px; padding: 16px; background: #f8faff; margin-top: 8px;">';
            html += '<div style="font-weight: bold; margin-bottom: 8px;">Color Names</div>';
            for (let i = 1; i <= num; i++) {
              let val = colorValues[i-1] !== undefined ? colorValues[i-1] : '';
              html += '<div style="margin-left: 24px; margin-bottom: 8px;"><input type="text" name="colorName' + i + '" placeholder="Color ' + i + '" style="width: 90%; padding: 6px; border-radius: 4px; border: 1px solid #ccc;" value="' + val.replace(/"/g, '&quot;') + '"></div>';
            }
            html += '</div>';
            $('#color-names-group').html(html);
          });

          // Prevent non-numeric input in width and length fields
          $('#ht-width, #ht-length').on('keydown', function(e) {
            if (["e", "E", "+", "-"].includes(e.key)) {
              e.preventDefault();
            }
          });

          // Dummy Fill Button Handler - Moved inside showQuotationCreateForm2 where selectCompany is defined
          $('#dummy-fill-btn').on('click', function() {
            // Reset all fields first
            $('#quotation2-company-input').val('');
            $('#quotation2-company-id').val('');
            $('#quotation2-keyperson').html('<option value="">-- Select Key Person --</option>').prop('disabled', false);
            $('#ht-quality').val('').trigger('change');
            $('#ht-num-colors').val('').trigger('blur');
            $('#ht-width').val('');
            $('#ht-length').val('');
            $('#color-names-group').empty();
            
            // Generate random data for all fields
            const qualities = ['PU', 'Silicon'];
            const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Purple', 'Orange', 'Pink', 'Brown'];
            const numColors = Math.floor(Math.random() * 3) + 1; // Random 1-3 colors
            const width = Math.floor(Math.random() * 200) + 50; // Random 50-250
            const length = Math.floor(Math.random() * 300) + 100; // Random 100-400

            // Select a random company and key person if customers data is available
            if (typeof customers !== 'undefined' && customers.length > 0) {
              const randomCompany = customers[Math.floor(Math.random() * customers.length)];
              // Use the existing selectCompany function
              selectCompany(randomCompany.id);

              // Select a random key person from the populated dropdown
              setTimeout(() => {
                const keyPersonOptions = $('#quotation2-keyperson option').not('[value=""]');
                if (keyPersonOptions.length > 0) {
                  const randomIndex = Math.floor(Math.random() * keyPersonOptions.length);
                  keyPersonOptions.eq(randomIndex).prop('selected', true);
                }
              }, 150); // Small delay to allow key persons to populate
            }
            
            // Small delay to ensure reset is complete
            setTimeout(() => {
              // Fill Quality
              const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
              $('#ht-quality').val(randomQuality).trigger('change');
              
              // Fill Number of Colors
              $('#ht-num-colors').val(numColors).trigger('blur');
              
              // Fill Color Names
              setTimeout(() => {
                // Shuffle colors array
                const shuffledColors = [...colors].sort(() => 0.5 - Math.random());
                for(let i = 1; i <= numColors; i++) {
                   $('#color-names-group input[name="colorName' + i + '"]').val(shuffledColors[i-1]);
                }
              }, 100);
              
              // Fill Width and Length
              $('#ht-width').val(width);
              $('#ht-length').val(length);
            }, 100);
          });
        });
        </script>
      `);

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
    });
  });
}