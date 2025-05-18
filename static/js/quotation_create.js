// Only attach the handler for Quotation Create button once, and do not globally override anything else
$(function() {
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

  // Handle form submission
  $('#quotation2-create2-form form').submit(function(e) {
    e.preventDefault();
    
    // Validate company
    const companyId = $('#quotation2-company-id').val();
    if (!companyId) {
      alert('Please select a company from the list.');
      return;
    }

    // Validate key person
    const keyPersonIdx = $('#quotation2-keyperson').val();
    const company = customers.find(c => c.id == companyId);
    let keyPersonId = null;
    if (company && Array.isArray(company.keyPeople) && keyPersonIdx !== "") {
      const kp = company.keyPeople[keyPersonIdx];
      keyPersonId = kp && kp.id ? kp.id : null;
    }
    if (!keyPersonId) {
      alert('Please select a key person.');
      return;
    }

    // Validate product type
    const productType = $('#quotation2-product-type').val();
    if (!productType) {
      alert('Please select a product type.');
      return;
    }

    // Gather dynamic fields
    const attributes = {};
    $('#quotation2-dynamic-fields').find('input, select').each(function() {
      const name = $(this).attr('name');
      const value = $(this).val();
      if (name && value) {
        attributes[name] = value;
      }
    });

    // Send to server
    $.ajax({
      url: '/quotations2',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        customer_id: companyId,
        key_person_id: keyPersonId,
        product_type: productType,
        attributes: attributes
      }),
      success: function(resp) {
        alert('Quotation created successfully!');
        showQuotationCreateForm2(); // Reset form
      },
      error: function(xhr) {
        let msg = 'Failed to create quotation.';
        try {
          const r = JSON.parse(xhr.responseText);
          if (r && r.error) msg += ' ' + r.error;
        } catch(e) {}
        alert(msg);
      }
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
  // First fetch customers for company search
  fetchCustomers(function() {
    $('#right-frame').html(`
      <div style="padding:32px;max-width:600px;">
        <h2>Create Quotation 2</h2>
        <form id="quotation2-create2-form" autocomplete="off">
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
          </label><br><br>
          <div id="quotation2-dynamic-fields">
            <label>Quality:<br>
              <select name="quality">
                <option value="">-- Select --</option>
                <option value="PU">PU</option>
                <option value="Silicon">Silicon</option>
              </select>
            </label><br>
            <label>Flat or Raised:<br>
              <select name="flatOrRaised">
                <option value="">-- Select --</option>
                <option value="Flat">Flat</option>
                <option value="Raised">Raised</option>
              </select>
            </label><br>
            <label>Direct or Reverse:<br>
              <select name="directOrReverse">
                <option value="">-- Select --</option>
                <option value="Direct">Direct</option>
                <option value="Reverse">Reverse</option>
              </select>
            </label><br>
            <label>Thickness:<br>
              <input type="number" name="thickness" min="0" value="">
            </label><br>
            <label># of Colors:<br>
              <input type="number" name="numColors" min="1" value="1">
            </label><br>
            <label>Width:<br>
              <input type="number" name="width" min="0" value="">
            </label><br>
            <label>Length:<br>
              <input type="number" name="length" min="0" value="">
            </label><br>
          </div>
          <br>
          <button type="submit" style="padding:8px 32px;">Submit</button>
        </form>
      </div>
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
} 