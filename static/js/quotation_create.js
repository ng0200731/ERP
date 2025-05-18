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
        <h2>Create Quotation 2</h2>
        <form id="quotation2-create-form" autocomplete="off">
          <label>Company:<br>
            <input type="text" id="quotation2-company-input" list="company2-list" placeholder="Type to search or select..." autocomplete="off" style="width: 100%; padding: 8px; margin-bottom: 4px;">
            <datalist id="company2-list">
              ${customers.map(c => `<option value="${c.company}" data-id="${c.id}">`).join('')}
            </datalist>
            <input type="hidden" id="quotation2-company-id">
          </label><br><br>
          <label>Key Person:<br>
            <select id="quotation2-keyperson" style="width: 100%; padding: 8px;">
              <option value="">-- Select Key Person --</option>
            </select>
          </label><br><br>
          <label>Product Type:<br>
            <select id="quotation2-product-type" style="width: 100%; padding: 8px;">
              ${productTypeOptions}
            </select>
          </label><br><br>
          <div id="quotation2-dynamic-fields"></div>
          <br>
          <button type="submit" style="padding:8px 32px;">Submit</button>
        </form>
      </div>
    `);

    // Company search functionality
    $('#quotation2-company-input').on('input', function() {
      const val = $(this).val().toLowerCase();
      let matches = customers.filter(c => c.company.toLowerCase().includes(val));
      
      // Update datalist
      let html = matches.map(c => `<option value="${c.company}" data-id="${c.id}">`).join('');
      $('#company2-list').html(html);
      
      // Find exact match
      const exactMatch = customers.find(c => c.company.toLowerCase() === val.toLowerCase());
      if (exactMatch) {
        $('#quotation2-company-id').val(exactMatch.id);
        // Populate key people for the matched company
        let kpOpts = '<option value="">-- Select Key Person --</option>';
        if (Array.isArray(exactMatch.keyPeople)) {
          kpOpts += exactMatch.keyPeople.map((kp, idx) => `<option value="${idx}">${kp.name} (${kp.position})</option>`).join('');
        }
        $('#quotation2-keyperson').html(kpOpts);
      } else {
        $('#quotation2-company-id').val('');
        $('#quotation2-keyperson').html('<option value="">-- Select Key Person --</option>');
      }
    });

    // Handle company selection from datalist
    $('#quotation2-company-input').on('change', function() {
      const val = $(this).val();
      const company = customers.find(c => c.company === val);
      if (company) {
        $('#quotation2-company-id').val(company.id);
        // Populate key people
        let kpOpts = '<option value="">-- Select Key Person --</option>';
        if (Array.isArray(company.keyPeople)) {
          kpOpts += company.keyPeople.map((kp, idx) => `<option value="${idx}">${kp.name} (${kp.position})</option>`).join('');
        }
        $('#quotation2-keyperson').html(kpOpts);
      }
    });

    // Only render dynamic fields, no other functionality
    $('#quotation2-product-type').on('change', function() {
      renderDynamicFieldsBlank2(productTypeFields);
    });
    renderDynamicFieldsBlank2(productTypeFields);
  });
}

function renderDynamicFieldsBlank2(productTypeFields) {
  const type = $('#quotation2-product-type').val();
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
  $('#quotation2-dynamic-fields').html(html);
  $('#quotation2-dynamic-fields [name="numColors"]').off('input').on('input', function() {
    renderDynamicFieldsBlank2(productTypeFields);
  });
} 