// Stub para web: @react-native-community/datetimepicker no soporta web.
// Usa un input HTML nativo tipo "date".
import React from 'react';
import { DateTimePickerProps } from './DateTimePicker';

export default function DateTimePicker({ value, onChange, minimumDate, maximumDate }: DateTimePickerProps) {
  const toInputValue = (d: Date) => d.toISOString().split('T')[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T00:00:00');
    if (onChange) onChange({} as any, newDate);
  };

  return (
    <input
      type="date"
      value={toInputValue(value)}
      min={minimumDate ? toInputValue(minimumDate) : undefined}
      max={maximumDate ? toInputValue(maximumDate) : undefined}
      onChange={handleChange}
      style={{
        padding: '12px 16px',
        fontSize: 16,
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: 20,
        color: '#0f172a',
      } as React.CSSProperties}
    />
  );
}
