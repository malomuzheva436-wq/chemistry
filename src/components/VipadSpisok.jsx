import React, { useState, useRef, useMemo, useCallback } from 'react';
import { formulaToSubscript } from './funcional/FormatFormul';

const VipadSpisok = React.memo(function VipadSpisok({
  placeholder,
  values,
  value,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  const filteredValues = useMemo(() => {
    if (!value) return values;

    const lower = value.toLowerCase();

    return values.filter((v) => v.toLowerCase().includes(lower));
  }, [values, value]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 150);
  }, []);

  const handleChange = useCallback(
    (event) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const handleItemClick = useCallback(
    (val) => {
      onChange(val);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div className="searchable-dropdown">
      <input
        ref={inputRef}
        type="text"
        className="dropdown-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
      />

      {isOpen && (
        <div className="dropdown-list open">
          {filteredValues.length > 0 ? (
            filteredValues.map((val) => (
              <div
                key={val}
                className={`dropdown-item ${val === value ? 'selected' : ''}`}
                onMouseDown={() => handleItemClick(val)}
              >
                {formulaToSubscript(val)}
              </div>
            ))
          ) : (
            <div className="no-results">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
});

export default VipadSpisok;