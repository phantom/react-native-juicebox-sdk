import AsyncStorage from '@react-native-async-storage/async-storage';

enum ReminderInterval {
  TwelveHours = 12 * 60 * 60 * 1000,
  OneDay = 1 * 24 * 60 * 60 * 1000,
  ThreeDays = 3 * 24 * 60 * 60 * 1000,
  SevenDays = 7 * 24 * 60 * 60 * 1000,
  FourteenDays = 14 * 24 * 60 * 60 * 1000,
}

const LAST_REMINDER_TIME_KEY = 'lastReminderTime';
const REMINDER_INTERVAL_KEY = 'reminderInterval';

export const reset = async () => {
  await AsyncStorage.removeItem(REMINDER_INTERVAL_KEY);
  await AsyncStorage.removeItem(LAST_REMINDER_TIME_KEY);
};

export const updateLastReminderTime = async () => {
  await AsyncStorage.setItem(LAST_REMINDER_TIME_KEY, `${Date.now()}`);
};

export const completedReminder = async (incorrectAttempts: boolean) => {
  await updateLastReminderTime();
  const reminderInterval = incorrectAttempts
    ? await previousReminderInterval()
    : await nextReminderInterval();
  await AsyncStorage.setItem(REMINDER_INTERVAL_KEY, `${reminderInterval}`);
};

export const isDueForReminder = async (): Promise<boolean> => {
  const lastReminderTime = await getLastReminderTime();
  const reminderInterval = await getReminderInterval();
  return lastReminderTime + reminderInterval <= Date.now();
};

const getReminderInterval = async (): Promise<ReminderInterval> => {
  const storedReminderInterval = await AsyncStorage.getItem(
    REMINDER_INTERVAL_KEY
  );
  return storedReminderInterval
    ? parseInt(storedReminderInterval, 10)
    : ReminderInterval.TwelveHours;
};

const getLastReminderTime = async (): Promise<number> => {
  const storedLastReminderTime = await AsyncStorage.getItem(
    LAST_REMINDER_TIME_KEY
  );
  return storedLastReminderTime ? parseInt(storedLastReminderTime, 10) : 0;
};

const nextReminderInterval = async (): Promise<ReminderInterval> => {
  switch (await getReminderInterval()) {
    case ReminderInterval.TwelveHours:
      return ReminderInterval.OneDay;
    case ReminderInterval.OneDay:
      return ReminderInterval.ThreeDays;
    case ReminderInterval.ThreeDays:
      return ReminderInterval.SevenDays;
    case ReminderInterval.SevenDays:
      return ReminderInterval.FourteenDays;
    case ReminderInterval.FourteenDays:
      return ReminderInterval.FourteenDays;
  }
};

const previousReminderInterval = async (): Promise<ReminderInterval> => {
  switch (await getReminderInterval()) {
    case ReminderInterval.TwelveHours:
      return ReminderInterval.TwelveHours;
    case ReminderInterval.OneDay:
      return ReminderInterval.TwelveHours;
    case ReminderInterval.ThreeDays:
      return ReminderInterval.OneDay;
    case ReminderInterval.SevenDays:
      return ReminderInterval.ThreeDays;
    case ReminderInterval.FourteenDays:
      return ReminderInterval.SevenDays;
  }
};
