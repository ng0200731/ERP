document.body.style.background = 'red';
alert('[HT Quotation JS v1.0.0] JS IS LOADED!');
$(document).ready(function() {
    alert('[HT Quotation JS v1.0.0] Loaded'); // Version popup
    // Initialize form elements
    const qualitySelect = $('#quality');
    const flatRaisedSelect = $('#flat_or_raised');
    const directReverseSelect = $('#direct_or_reverse');
    const thicknessInput = $('#thickness');
    const quotationForm = $('#ht-quotation-form');

    // Event listeners
    qualitySelect.on('change', updateFormState);
    flatRaisedSelect.on('change', updateFormState);

    // Initial setup
    updateFormState();

    // Form submission
    quotationForm.on('submit', function(e) {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        $.ajax({
            url: '/ht_quotation',
            type: 'POST',
            data: $(this).serialize(),
            success: function(response) {
                window.location.reload();
            },
            error: function(xhr) {
                alert('Error submitting form: ' + (xhr.responseJSON?.error || 'Unknown error'));
            }
        });
    });

    function validateForm() {
        const quality = qualitySelect.val();
        const flatRaised = flatRaisedSelect.val();
        const directReverse = directReverseSelect.val();
        const thickness = thicknessInput.val();
        if (!quality || !flatRaised || !directReverse) {
            alert('Please fill in all required fields');
            return false;
        }
        if (quality === 'silicon' && flatRaised === 'raised' && !thickness) {
            alert('Thickness is required for raised silicon');
            return false;
        }
        return true;
    }

    function updateFormState() {
        const selectedQuality = qualitySelect.val();
        alert('[DEBUG] updateFormState called. selectedQuality=' + selectedQuality);

        // Always clear and repopulate options
        flatRaisedSelect.find('option').remove();
        directReverseSelect.find('option').remove();

        if (selectedQuality === 'PU') {
            alert('[DEBUG] PU branch');
            flatRaisedSelect.append('<option value="flat">Flat</option>');
            flatRaisedSelect.val('flat').prop('disabled', true);

            directReverseSelect.append('<option value="direct">Direct</option>');
            directReverseSelect.val('direct').prop('disabled', true);

            thicknessInput.val('').prop('disabled', true);
        } else if (selectedQuality === 'silicon') {
            alert('[DEBUG] silicon branch');
            flatRaisedSelect.append('<option value="">-- Select --</option>');
            flatRaisedSelect.append('<option value="flat">Flat</option>');
            flatRaisedSelect.append('<option value="raised">Raised</option>');
            flatRaisedSelect.prop('disabled', false);

            const frVal = flatRaisedSelect.val();
            alert('[DEBUG] silicon branch, frVal=' + frVal);
            if (frVal === 'flat') {
                alert('[DEBUG] silicon-flat branch');
                directReverseSelect.append('<option value="flat">Flat</option>');
                directReverseSelect.val('flat').prop('disabled', true);
                thicknessInput.val('').prop('disabled', true);
            } else if (frVal === 'raised') {
                alert('[DEBUG] silicon-raised branch');
                directReverseSelect.append('<option value="direct">Direct</option>');
                directReverseSelect.append('<option value="reverse">Reverse</option>');
                directReverseSelect.prop('disabled', false);
                thicknessInput.prop('disabled', false);
            } else {
                alert('[DEBUG] silicon-else branch');
                directReverseSelect.append('<option value="">-- Select --</option>');
                directReverseSelect.prop('disabled', true);
                thicknessInput.val('').prop('disabled', true);
            }
        } else {
            alert('[DEBUG] else branch');
            flatRaisedSelect.append('<option value="">-- Select --</option>');
            flatRaisedSelect.append('<option value="flat">Flat</option>');
            flatRaisedSelect.append('<option value="raised">Raised</option>');
            flatRaisedSelect.prop('disabled', false);
            directReverseSelect.append('<option value="">-- Select --</option>');
            directReverseSelect.prop('disabled', true);
            thicknessInput.val('').prop('disabled', true);
        }
    }
}); 