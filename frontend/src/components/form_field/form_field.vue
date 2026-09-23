<script src="./form_field.js"></script>
<template>
  <div class="field">
    <label class="field-label" :for="field.key">{{ field.label }}<span v-if="field.is_required"> *</span></label>
    <input v-if="field.type === 'input'" :id="field.key" class="input" type="text" :name="field.key"
      :value="value" :maxlength="field.max_length || 10000" :placeholder="field.placeholder"
      :required="field.is_required" :disabled="is_disabled" :aria-invalid="Boolean(error)"
      :aria-describedby="described_by" @input="$emit('update', $event.target.value)" />
    <textarea v-else :id="field.key" class="textarea" :name="field.key" :rows="field.rows || 3"
      :value="value" :maxlength="field.max_length || 10000" :placeholder="field.placeholder"
      :required="field.is_required" :disabled="is_disabled" :aria-invalid="Boolean(error)"
      :aria-describedby="described_by" @input="$emit('update', $event.target.value)"></textarea>
    <p v-if="field.hint" :id="`${field.key}_hint`" class="field-help">{{ field.hint }}</p>
    <p v-if="error" :id="`${field.key}_error`" class="field-error">{{ error }}</p>
  </div>
</template>
