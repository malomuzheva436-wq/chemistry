import React, { useState } from 'react';
import Modal from './Modal';
import VipadSpisok from './VipadSpisok';
import {
  FORMULA_VALUES,
  CHARACTERISTICS,
  getCharacteristicLabel,
  getUnitsForCharacteristic,
} from './funcional/Spravochnik';

const initialFormState = {
  characteristica: '',
  formula: '',
  value: '',
  izmerenie: '',
};

export default function ModalDano({ onClose, onSubmit }) {
  const [form, setForm] = useState(initialFormState);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Смена характеристики + сброс измерения, если оно не подходит
  const handleCharacteristicChange = (value) => {
    const allowedUnits = getUnitsForCharacteristic(value);

    setForm((prev) => ({
      ...prev,
      characteristica: value,
      izmerenie: allowedUnits.includes(prev.izmerenie)
        ? prev.izmerenie
        : '',
    }));
  };

  // Единицы, доступные для текущей характеристики
  const availableUnits = getUnitsForCharacteristic(form.characteristica);

  const handleSubmit = () => {
    const { characteristica, formula, value, izmerenie } = form;

    if (!characteristica || !formula.trim() || !value.trim() || !izmerenie) {
      alert('Заполните все поля');
      return;
    }

    onSubmit({
      charText: getCharacteristicLabel(characteristica),
      formula,
      value,
      izmerenie,
    });

    onClose();
  };

  return (
    <Modal onClose={onClose} title="Укажите данные">
      <div className="modal-body">
        <select
          className="modal-select"
          value={form.characteristica}
          onChange={(event) => handleCharacteristicChange(event.target.value)}>
          <option value="">известная характеристика</option>

          {CHARACTERISTICS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <VipadSpisok
          placeholder="формула"
          values={FORMULA_VALUES}
          value={form.formula}
          onChange={(val) => updateField('formula', val)}
        />

        <span className="equals-sign">=</span>

        <input
          type="text"
          className="modal-input"
          placeholder="введите значение"
          value={form.value}
          onChange={(event) => updateField('value', event.target.value)}
        />

        <select
          className="modal-select izmerenie"
          value={form.izmerenie}
          onChange={(event) => updateField('izmerenie', event.target.value)}
        >
          <option value="">измерение</option>

          {availableUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>

        <button className="modal-btn modal-btn-ok" onClick={handleSubmit}>
          ОК
        </button>

        <button className="modal-btn modal-btn-cancel" onClick={onClose}>
          Отмена
        </button>
      </div>
    </Modal>
  );
}