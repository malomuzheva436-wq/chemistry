import React, { useState } from 'react';
import Modal from './Modal';
import VipadSpisok from './VipadSpisok';
import { FORMULA_VALUES, CATALYSTS } from './funcional/Spravochnik';

const initialFormState = {
  vesh1: '',
  vesh2: '',
  vesh3: '',
  catalyst: '',
};

export default function ModalUravnenia({ onClose, onSubmit }) {
  const [form, setForm] = useState(initialFormState);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    const { vesh1 } = form;

    // Для реакций разложения достаточно ОДНОГО вещества слева
    if (!vesh1.trim()) {
      alert('Укажите хотя бы одно вещество');
      return;
    }

    onSubmit(form);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Укажите данные"
      contentClassName="modal modal-reaction"
    >
      <div className="modal-body">
        <div className="reaction-main-row">
          <VipadSpisok
            placeholder="вещество 1"
            values={FORMULA_VALUES}
            value={form.vesh1}
            onChange={(val) => updateField('vesh1', val)}
          />

          <span className="plus-sign">+</span>

          <VipadSpisok
            placeholder="вещество 2"
            values={FORMULA_VALUES}
            value={form.vesh2}
            onChange={(val) => updateField('vesh2', val)}
          />

          <span className="plus-sign">+</span>

          <VipadSpisok
            placeholder="вещество 3"
            values={FORMULA_VALUES}
            value={form.vesh3}
            onChange={(val) => updateField('vesh3', val)}
          />

          <div className="reaction-arrow-row">
            <div className="catalyst-wrapper">
              <VipadSpisok
                placeholder="катализатор / условие (t)"
                values={CATALYSTS}
                value={form.catalyst}
                onChange={(val) => updateField('catalyst', val)}
              />
            </div>

            <span className="arrow-text">{'---->'}</span>
          </div>

          <div className="reaction-buttons">
            <button
              className="modal-btn modal-btn-ok"
              onClick={handleSubmit}
            >
              ОК
            </button>

            <button className="modal-btn modal-btn-cancel" onClick={onClose}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}