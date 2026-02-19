import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  PaymentMethod,
  openPaymentApp,
  getDefaultMatchFeeConfig,
  getPaymentInstructions,
} from '../lib/payments';
import { formatCurrency } from '../lib/formatters';

interface PaymentButtonProps {
  amount: number;
  description: string;
  onPaymentComplete?: () => void;
  onPaymentError?: (error: string) => void;
  recipientOverrides?: Partial<Record<PaymentMethod, string>>;
  buttonStyle?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

const PAYMENT_METHODS: { method: PaymentMethod; label: string; icon: string; color: string }[] = [
  { method: 'venmo', label: 'Venmo', icon: '💳', color: '#008CFF' },
  { method: 'cashapp', label: 'Cash App', icon: '💵', color: '#00D632' },
  { method: 'zelle', label: 'Zelle', icon: '🏦', color: '#6B1CB0' },
  { method: 'paypal', label: 'PayPal', icon: '🌐', color: '#003087' },
];

export function PaymentButton({
  amount,
  description,
  onPaymentComplete,
  onPaymentError,
  recipientOverrides,
  buttonStyle = 'primary',
  disabled = false,
}: PaymentButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [processing, setProcessing] = useState<PaymentMethod | null>(null);

  const handleSelectMethod = async (method: PaymentMethod) => {
    setProcessing(method);
    
    const config = getDefaultMatchFeeConfig(method, description, recipientOverrides);
    config.amount = amount;
    
    const result = await openPaymentApp(config);
    
    setProcessing(null);
    setModalVisible(false);
    
    if (result.success) {
      onPaymentComplete?.();
    } else if (result.fallbackUrl) {
      Alert.alert(
        'App Not Installed',
        result.error,
        [
          {
            text: 'Open Web',
            onPress: async () => {
              const { Linking } = await import('react-native');
              await Linking.openURL(result.fallbackUrl!);
            },
          },
          {
            text: 'Copy Instructions',
            onPress: () => {
              Alert.alert('Instructions', getPaymentInstructions(method, config.recipientUsername, amount));
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else if (method === 'zelle') {
      Alert.alert(
        'Zelle Payment',
        getPaymentInstructions(method, config.recipientUsername, amount),
        [
          { text: 'I\'ve Paid', onPress: () => onPaymentComplete?.() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      onPaymentError?.(result.error || 'Payment failed');
    }
  };

  const getButtonStyles = () => {
    switch (buttonStyle) {
      case 'primary':
        return styles.buttonPrimary;
      case 'secondary':
        return styles.buttonSecondary;
      case 'outline':
        return styles.buttonOutline;
      default:
        return styles.buttonPrimary;
    }
  };

  const getButtonTextStyles = () => {
    switch (buttonStyle) {
      case 'outline':
        return styles.buttonTextOutline;
      default:
        return styles.buttonText;
    }
  };

  return (
    <React.Fragment>
      <TouchableOpacity
        style={[styles.button, getButtonStyles(), disabled && styles.buttonDisabled]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={getButtonTextStyles()}>
          💰 Pay {formatCurrency(amount * 100)}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <Text style={styles.modalSubtitle}>{description}</Text>
            <Text style={styles.modalAmount}>{formatCurrency(amount * 100)}</Text>

            <View style={styles.methodsContainer}>
              {PAYMENT_METHODS.map(({ method, label, icon, color }) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.methodButton, { borderColor: color }]}
                  onPress={() => handleSelectMethod(method)}
                  disabled={processing !== null}
                >
                  {processing === method ? (
                    <ActivityIndicator size="small" color={color} />
                  ) : (
                    <React.Fragment>
                      <Text style={styles.methodIcon}>{icon}</Text>
                      <Text style={[styles.methodLabel, { color }]}>{label}</Text>
                    </React.Fragment>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#e94560',
  },
  buttonSecondary: {
    backgroundColor: '#16213e',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e94560',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalAmount: {
    color: '#e94560',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  methodsContainer: {
    gap: 12,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    gap: 12,
  },
  methodIcon: {
    fontSize: 24,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
});
