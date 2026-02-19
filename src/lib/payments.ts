import { Linking, Alert, Platform } from 'react-native';

export type PaymentMethod = 'venmo' | 'cashapp' | 'zelle' | 'paypal';

export interface PaymentConfig {
  method: PaymentMethod;
  recipientUsername: string;
  amount: number; // in dollars
  note: string;
}

// League treasurer payment usernames (should come from config/admin settings)
const DEFAULT_RECIPIENT = {
  venmo: '@treasurer', // Replace with actual league treasurer
  cashapp: '$treasurer',
  zelle: 'treasurer@league.com',
  paypal: 'treasurer@league.com',
};

/**
 * Generate deep link URL for payment apps
 */
function generateDeepLink(config: PaymentConfig): string | null {
  const { method, recipientUsername, amount, note } = config;
  const encodedNote = encodeURIComponent(note);
  const amountStr = amount.toFixed(2);

  switch (method) {
    case 'venmo':
      // venmo://paycharge?txn=pay&recipients=username&amount=10.00&note=note
      return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(recipientUsername)}&amount=${amountStr}&note=${encodedNote}`;
    
    case 'cashapp':
      // cashapp://pay?recipient=$username&amount=10&note=note
      // Note: Cash App deep links are limited; fallback to web often needed
      return `https://cash.app/${recipientUsername}/${amountStr}`;
    
    case 'zelle':
      // Zelle doesn't have a public deep link scheme
      // Return null to indicate manual payment needed
      return null;
    
    case 'paypal':
      // paypal://pay?recipient=email&amount=10.00&currency=USD
      return `https://paypal.me/${recipientUsername}/${amountStr}USD`;
    
    default:
      return null;
  }
}

/**
 * Check if a payment app is installed (best effort)
 */
export async function isPaymentAppInstalled(method: PaymentMethod): Promise<boolean> {
  if (method === 'zelle') return false; // No deep link support
  
  const testUrl = method === 'venmo' ? 'venmo://' : 
                  method === 'cashapp' ? 'cashapp://' : 
                  'paypal://';
  
  try {
    return await Linking.canOpenURL(testUrl);
  } catch {
    return false;
  }
}

/**
 * Open payment app with pre-filled details
 */
export async function openPaymentApp(config: PaymentConfig): Promise<{ success: boolean; error?: string; fallbackUrl?: string }> {
  const deepLink = generateDeepLink(config);
  
  // For Zelle, always show manual instructions
  if (config.method === 'zelle') {
    return {
      success: false,
      error: 'Zelle requires manual payment. Please send via your banking app.',
    };
  }
  
  // For Cash App and PayPal, use web links as primary (more reliable)
  if (config.method === 'cashapp' || config.method === 'paypal') {
    const webUrl = deepLink; // These are already web URLs
    try {
      const canOpen = await Linking.canOpenURL(webUrl!);
      if (canOpen) {
        await Linking.openURL(webUrl!);
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: 'Could not open payment link' };
    }
  }
  
  // For Venmo, try deep link first
  if (config.method === 'venmo' && deepLink) {
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
        return { success: true };
      } else {
        // Venmo not installed - provide web fallback
        const webUrl = `https://venmo.com/${config.recipientUsername}?txn=pay&amount=${config.amount.toFixed(2)}&note=${encodeURIComponent(config.note)}`;
        return {
          success: false,
          error: 'Venmo app not installed. Use web version?',
          fallbackUrl: webUrl,
        };
      }
    } catch (err) {
      return { success: false, error: 'Could not open Venmo' };
    }
  }
  
  return { success: false, error: 'Payment method not supported' };
}

/**
 * Show payment options for a match fee
 */
export function showPaymentOptions(
  amount: number,
  matchDescription: string,
  onSelect: (method: PaymentMethod) => void
): void {
  const options: { method: PaymentMethod; label: string; icon: string }[] = [
    { method: 'venmo', label: 'Venmo', icon: '💳' },
    { method: 'cashapp', label: 'Cash App', icon: '💵' },
    { method: 'zelle', label: 'Zelle (Manual)', icon: '🏦' },
    { method: 'paypal', label: 'PayPal', icon: '🌐' },
  ];
  
  Alert.alert(
    'Pay Match Fee',
    `Amount: $${amount.toFixed(2)}\n${matchDescription}`,
    [
      ...options.map(opt => ({
        text: `${opt.icon} ${opt.label}`,
        onPress: () => onSelect(opt.method),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]
  );
}

/**
 * Get payment instructions for manual methods
 */
export function getPaymentInstructions(method: PaymentMethod, recipient: string, amount: number): string {
  switch (method) {
    case 'zelle':
      return `Please send $${amount.toFixed(2)} via Zelle to: ${recipient}\n\nOpen your banking app and send the payment, then mark it as paid in the app.`;
    case 'venmo':
      return `Send $${amount.toFixed(2)} via Venmo to: ${recipient}`;
    case 'cashapp':
      return `Send $${amount.toFixed(2)} via Cash App to: ${recipient}`;
    case 'paypal':
      return `Send $${amount.toFixed(2)} via PayPal to: ${recipient}`;
    default:
      return '';
  }
}

/**
 * Default payment config for match fees
 */
export function getDefaultMatchFeeConfig(
  method: PaymentMethod,
  matchDescription: string,
  recipientOverrides?: Partial<Record<PaymentMethod, string>>
): PaymentConfig {
  const recipient = recipientOverrides?.[method] || DEFAULT_RECIPIENT[method];
  
  return {
    method,
    recipientUsername: recipient,
    amount: 5.00, // Default $5 per player
    note: `Pool match: ${matchDescription}`,
  };
}
