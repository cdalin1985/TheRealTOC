import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { ActivityType } from '../types/treasury';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationData {
  activityId?: string;
  type?: ActivityType;
  challengeId?: string | null;
  matchId?: string | null;
  screen?: string;
}

export interface PushNotification {
  title: string;
  body: string;
  data?: PushNotificationData;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private token: string | null = null;
  private playerId: string | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(playerId: string): Promise<boolean> {
    this.playerId = playerId;

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return false;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Get push token
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.token = token;

      // Save token to database
      await this.saveToken(token);

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#e94560',
        });

        // Create separate channels for different notification types
        await Notifications.setNotificationChannelAsync('challenges', {
          name: 'Challenges',
          description: 'Challenge-related notifications',
          importance: Notifications.AndroidImportance.HIGH,
        });

        await Notifications.setNotificationChannelAsync('matches', {
          name: 'Matches',
          description: 'Match-related notifications',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      // Listen for token updates
      Notifications.addPushTokenListener(this.handleTokenUpdate);

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  private handleTokenUpdate = async (newToken: Notifications.ExpoPushToken) => {
    if (newToken.data !== this.token) {
      this.token = newToken.data;
      await this.saveToken(newToken.data);
    }
  };

  private async saveToken(token: string): Promise<void> {
    if (!this.playerId) return;

    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          player_id: this.playerId,
          token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'player_id,token',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  async removeToken(): Promise<void> {
    if (!this.token || !this.playerId) return;

    try {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('player_id', this.playerId)
        .eq('token', this.token);

      this.token = null;
    } catch (error) {
      console.error('Failed to remove push token:', error);
    }
  }

  // Schedule a local notification (for reminders)
  async scheduleLocalNotification(
    notification: PushNotification,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
        },
        trigger,
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  // Cancel a scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  // Clear badge
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  // Schedule match reminder (tomorrow reminder)
  async scheduleMatchReminder(
    matchId: string,
    opponentName: string,
    scheduledAt: string
  ): Promise<string | null> {
    const matchDate = new Date(scheduledAt);
    const reminderTime = new Date(matchDate);
    reminderTime.setDate(reminderTime.getDate() - 1); // 1 day before
    reminderTime.setHours(18, 0, 0, 0); // 6 PM

    // Only schedule if reminder time is in the future
    if (reminderTime <= new Date()) {
      return null;
    }

    return this.scheduleLocalNotification(
      {
        title: 'Match Tomorrow',
        body: `Your match with ${opponentName} is scheduled for tomorrow at ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        data: {
          matchId,
          screen: 'MatchDetail',
        },
      },
      {
        date: reminderTime,
      }
    );
  }

  // Schedule match start reminder (30 min before)
  async scheduleMatchStartReminder(
    matchId: string,
    opponentName: string,
    scheduledAt: string
  ): Promise<string | null> {
    const matchDate = new Date(scheduledAt);
    const reminderTime = new Date(matchDate);
    reminderTime.setMinutes(reminderTime.getMinutes() - 30);

    if (reminderTime <= new Date()) {
      return null;
    }

    return this.scheduleLocalNotification(
      {
        title: 'Match Starting Soon',
        body: `Your match with ${opponentName} starts in 30 minutes`,
        data: {
          matchId,
          screen: 'MatchDetail',
        },
      },
      {
        date: reminderTime,
      }
    );
  }

  // Add notification response listener
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Add notification received listener (while app is foregrounded)
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Remove listener
  removeListener(subscription: Notifications.Subscription): void {
    Notifications.removeNotificationSubscription(subscription);
  }
}

export const pushNotifications = PushNotificationService.getInstance();

// Hook for using push notifications in components
export function usePushNotifications(playerId: string | null) {
  const initialize = async () => {
    if (!playerId) return false;
    return pushNotifications.initialize(playerId);
  };

  const scheduleMatchReminder = async (
    matchId: string,
    opponentName: string,
    scheduledAt: string
  ) => {
    return pushNotifications.scheduleMatchReminder(matchId, opponentName, scheduledAt);
  };

  const cancelNotification = async (notificationId: string) => {
    return pushNotifications.cancelNotification(notificationId);
  };

  return {
    initialize,
    scheduleMatchReminder,
    cancelNotification,
    setBadgeCount: pushNotifications.setBadgeCount.bind(pushNotifications),
    clearBadge: pushNotifications.clearBadge.bind(pushNotifications),
  };
}
