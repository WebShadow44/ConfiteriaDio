// Wrapper con tipos auto-contenidos para que TypeScript lo resuelva correctamente.
// Metro usará este archivo en iOS/Android y DateTimePicker.web.tsx en web.
import NativeDateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React from 'react';

export type DateTimePickerProps = {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: string;
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

export default function DateTimePicker(props: DateTimePickerProps) {
  return <NativeDateTimePicker {...(props as any)} />;
}
