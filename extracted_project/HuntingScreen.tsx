import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Switch,
  Alert,
} from 'react-native';
import { ProgressBar } from '@react-native-community/progress-bar-android';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import { useAppStore } from '@store/appStore';
import { wsService } from '@services/websocket';

const screenWidth = Dimensions.get('window').width;

interface Target {
  id: string;
  ssid: string;
  bssid: string;
  channel: number;
  signalStrength: number;
  security: string;
  clients: number;
  handshakeCaptured: boolean;
  capturedAt?: number;
}

interface HuntingConfig {
  channels: number[];
  dwell_time: number;
  ai_aggression: 'low' | 'medium' | 'high';
  deauth_packets: number;
  handshake_timeout: number;
}

export default function HuntingScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTargetDetail, setShowTargetDetail] = useState(false);
  const [config, setConfig] = useState<HuntingConfig>({
    channels: [1, 6, 11],
    dwell_time: 5,
    ai_aggression: 'medium',
    deauth_packets: 10,
    handshake_timeout: 30,
  });

  const huntingStatus = useAppStore((state) => state.huntingStatus);
  const handshakes = useAppStore((state) => state.handshakes);
  const addActivityLog = useAppStore((state) => state.addActivityLog);
  const setHuntingStatus = useAppStore((state) => state.setHuntingStatus);

  useEffect(() => {
    // Request hunting status on mount
    wsService.requestHuntingStatus();

    // Setup hunting event listeners
    const huntingStatusListener = (data: any) => {
      setHuntingStatus(data);
    };

    const huntingEventListener = (data: any) => {
      if (data.type === 'target_found') {
        setTargets((prev) => {
          const existing = prev.find((t) => t.bssid === data.target.bssid);
          if (existing) {
            return prev.map((t) =>
              t.bssid === data.target.bssid ? { ...t, ...data.target } : t
            );
          }
          return [data.target, ...prev];
        });
      } else if (data.type === 'handshake_captured') {
        setTargets((prev) =>
          prev.map((t) =>
            t.bssid === data.bssid
              ? { ...t, handshakeCaptured: true, capturedAt: data.timestamp }
              : t
          )
        );
        addActivityLog({
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          type: 'handshake',
          severity: 'info',
          message: `Handshake captured: ${data.ssid}`,
        });
      }
    };

    wsService.on('hunting:status', huntingStatusListener);
    wsService.on('hunting:event', huntingEventListener);

    return () => {
      wsService.off('hunting:status', huntingStatusListener);
      wsService.off('hunting:event', huntingEventListener);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    wsService.requestHuntingStatus();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStartHunting = () => {
    wsService.startHunting(config.channels, config.ai_aggression);
    addActivityLog({
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      type: 'hunting',
      severity: 'info',
      message: `Hunting started on channels: ${config.channels.join(', ')}`,
    });
  };

  const handlePauseHunting = () => {
    wsService.pauseHunting();
    addActivityLog({
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      type: 'hunting',
      severity: 'warning',
      message: 'Hunting paused',
    });
  };

  const handleResumeHunting = () => {
    wsService.resumeHunting();
    addActivityLog({
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      type: 'hunting',
      severity: 'info',
      message: 'Hunting resumed',
    });
  };

  const handleStopHunting = () => {
    Alert.alert('Stop Hunting', 'Are you sure you want to stop hunting?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Stop',
        onPress: () => {
          wsService.stopHunting();
          setTargets([]);
          addActivityLog({
            id: `log-${Date.now()}`,
            timestamp: Date.now(),
            type: 'hunting',
            severity: 'warning',
            message: 'Hunting stopped',
          });
        },
      },
    ]);
  };

  const handleDeauth = (target: Target) => {
    Alert.alert(
      'De-authenticate Clients',
      `Send de-auth packets to ${target.ssid}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'De-auth',
          onPress: () => {
            wsService.send('hunting:deauth', {
              bssid: target.bssid,
              packets: config.deauth_packets,
            });
            addActivityLog({
              id: `log-${Date.now()}`,
              timestamp: Date.now(),
              type: 'deauth',
              severity: 'warning',
              message: `De-auth sent to ${target.ssid}`,
            });
          },
        },
      ]
    );
  };

  const toggleChannel = (channel: number) => {
    setConfig((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const renderTarget = ({ item }: { item: Target }) => (
    <TouchableOpacity
      style={styles.targetCard}
      onPress={() => {
        setSelectedTarget(item);
        setShowTargetDetail(true);
      }}
    >
      <LinearGradient
        colors={
          item.handshakeCaptured
            ? ['#00FF0033', '#00FF0011']
            : ['#FF005533', '#FF005511']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.targetGradient}
      >
        <View style={styles.targetHeader}>
          <View style={styles.targetInfo}>
            <View style={styles.ssidRow}>
              <MaterialCommunityIcons
                name="wifi"
                size={16}
                color={item.handshakeCaptured ? '#00FF00' : '#FF0055'}
              />
              <Text style={styles.ssidText}>{item.ssid || 'Hidden'}</Text>
            </View>
            <Text style={styles.bssidText}>{item.bssid}</Text>
          </View>
          <View style={styles.signalIndicator}>
            <Text style={styles.signalText}>{item.signalStrength} dBm</Text>
            <View style={styles.signalBars}>
              {[1, 2, 3, 4].map((bar) => (
                <View
                  key={bar}
                  style={[
                    styles.signalBar,
                    {
                      backgroundColor:
                        Math.abs(item.signalStrength) <= bar * 30
                          ? '#00FF00'
                          : '#333333',
                      height: bar * 4,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.targetDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Channel:</Text>
            <Text style={styles.detailValue}>{item.channel}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Security:</Text>
            <Text style={styles.detailValue}>{item.security}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Clients:</Text>
            <Text style={styles.detailValue}>{item.clients}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Handshake:</Text>
            <Text
              style={[
                styles.detailValue,
                { color: item.handshakeCaptured ? '#00FF00' : '#FF0055' },
              ]}
            >
              {item.handshakeCaptured ? 'Captured' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.targetActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deauthBtn]}
            onPress={() => handleDeauth(item)}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#000000" />
            <Text style={styles.actionBtnText}>De-Auth</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FF00" />}
    >
      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text
            style={[
              styles.statusValue,
              {
                color:
                  huntingStatus?.state === 'hunting'
                    ? '#00FF00'
                    : huntingStatus?.state === 'paused'
                      ? '#FFAA00'
                      : '#666666',
              },
            ]}
          >
            {huntingStatus?.state.toUpperCase() || 'IDLE'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Targets:</Text>
          <Text style={styles.statusValue}>{targets.length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Handshakes:</Text>
          <Text style={styles.statusValue}>
            {targets.filter((t) => t.handshakeCaptured).length}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Duration:</Text>
          <Text style={styles.statusValue}>
            {huntingStatus?.duration ? `${Math.floor(huntingStatus.duration / 60)}m` : '0m'}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      {huntingStatus && (
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Handshake Capture Progress</Text>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (targets.filter((t) => t.handshakeCaptured).length / Math.max(targets.length, 1)) * 100,
                    100
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {targets.filter((t) => t.handshakeCaptured).length} of {targets.length} captured
          </Text>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsCard}>
        <View style={styles.buttonRow}>
          {huntingStatus?.state === 'idle' ? (
            <TouchableOpacity
              style={[styles.controlBtn, styles.startBtn]}
              onPress={handleStartHunting}
            >
              <MaterialCommunityIcons name="play" size={20} color="#000000" />
              <Text style={styles.controlBtnText}>Start</Text>
            </TouchableOpacity>
          ) : huntingStatus?.state === 'hunting' ? (
            <>
              <TouchableOpacity
                style={[styles.controlBtn, styles.pauseBtn]}
                onPress={handlePauseHunting}
              >
                <MaterialCommunityIcons name="pause" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, styles.stopBtn]}
                onPress={handleStopHunting}
              >
                <MaterialCommunityIcons name="stop" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Stop</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.controlBtn, styles.resumeBtn]}
                onPress={handleResumeHunting}
              >
                <MaterialCommunityIcons name="play" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, styles.stopBtn]}
                onPress={handleStopHunting}
              >
                <MaterialCommunityIcons name="stop" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Stop</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.configBtn}
          onPress={() => setShowConfigModal(true)}
        >
          <MaterialCommunityIcons name="cog" size={18} color="#00FFFF" />
          <Text style={styles.configBtnText}>Configure</Text>
        </TouchableOpacity>
      </View>

      {/* Targets List */}
      <View style={styles.targetsHeader}>
        <Text style={styles.targetsTitle}>Discovered Targets ({targets.length})</Text>
      </View>

      {targets.length > 0 ? (
        <FlatList
          data={targets}
          renderItem={renderTarget}
          keyExtractor={(item) => item.bssid}
          scrollEnabled={false}
          style={styles.targetsList}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="wifi-off" size={48} color="#666666" />
          <Text style={styles.emptyStateText}>
            {huntingStatus?.state === 'hunting'
              ? 'Scanning for targets...'
              : 'Start hunting to discover targets'}
          </Text>
        </View>
      )}

      {/* Configuration Modal */}
      <Modal
        visible={showConfigModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hunting Configuration</Text>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#00FF00" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Channels */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>Wi-Fi Channels</Text>
                <View style={styles.channelGrid}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((ch) => (
                    <TouchableOpacity
                      key={ch}
                      style={[
                        styles.channelBtn,
                        config.channels.includes(ch) && styles.channelBtnActive,
                      ]}
                      onPress={() => toggleChannel(ch)}
                    >
                      <Text
                        style={[
                          styles.channelBtnText,
                          config.channels.includes(ch) && styles.channelBtnTextActive,
                        ]}
                      >
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dwell Time */}
              <View style={styles.configSection}>
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Dwell Time (seconds)</Text>
                  <Text style={styles.configValue}>{config.dwell_time}s</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        dwell_time: Math.max(1, prev.dwell_time - 1),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="minus" size={24} color="#00FF00" />
                  </TouchableOpacity>
                  <View style={styles.sliderBar}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${(config.dwell_time / 30) * 100}%` },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        dwell_time: Math.min(30, prev.dwell_time + 1),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="plus" size={24} color="#00FF00" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* AI Aggression */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>AI Aggression</Text>
                <View style={styles.aggressionButtons}>
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.aggressionBtn,
                        config.ai_aggression === level && styles.aggressionBtnActive,
                      ]}
                      onPress={() =>
                        setConfig((prev) => ({ ...prev, ai_aggression: level }))
                      }
                    >
                      <Text
                        style={[
                          styles.aggressionBtnText,
                          config.ai_aggression === level &&
                            styles.aggressionBtnTextActive,
                        ]}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* De-auth Packets */}
              <View style={styles.configSection}>
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>De-auth Packets</Text>
                  <Text style={styles.configValue}>{config.deauth_packets}</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        deauth_packets: Math.max(1, prev.deauth_packets - 5),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="minus" size={24} color="#00FF00" />
                  </TouchableOpacity>
                  <View style={styles.sliderBar}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${(config.deauth_packets / 100) * 100}%` },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        deauth_packets: Math.min(100, prev.deauth_packets + 5),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="plus" size={24} color="#00FF00" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Handshake Timeout */}
              <View style={styles.configSection}>
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Handshake Timeout (seconds)</Text>
                  <Text style={styles.configValue}>{config.handshake_timeout}s</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        handshake_timeout: Math.max(10, prev.handshake_timeout - 5),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="minus" size={24} color="#00FF00" />
                  </TouchableOpacity>
                  <View style={styles.sliderBar}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${(config.handshake_timeout / 120) * 100}%` },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setConfig((prev) => ({
                        ...prev,
                        handshake_timeout: Math.min(120, prev.handshake_timeout + 5),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="plus" size={24} color="#00FF00" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#0a0e27',
    borderColor: '#00FF00',
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: '#333333',
    borderBottomWidth: 1,
  },
  statusLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  statusValue: {
    color: '#00FF00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: '#0a0e27',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  progressLabel: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#1a1f3a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF00',
    borderRadius: 4,
  },
  progressText: {
    color: '#888888',
    fontSize: 11,
    textAlign: 'center',
  },
  controlsCard: {
    backgroundColor: '#0a0e27',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  startBtn: {
    backgroundColor: '#00FF00',
  },
  pauseBtn: {
    backgroundColor: '#FFAA00',
  },
  resumeBtn: {
    backgroundColor: '#00FFFF',
  },
  stopBtn: {
    backgroundColor: '#FF0055',
  },
  controlBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderColor: '#00FFFF',
    borderWidth: 1,
    borderRadius: 6,
    gap: 6,
  },
  configBtnText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  targetsHeader: {
    marginBottom: 12,
  },
  targetsTitle: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  targetsList: {
    marginBottom: 32,
  },
  targetCard: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  targetGradient: {
    padding: 12,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  targetInfo: {
    flex: 1,
  },
  ssidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ssidText: {
    color: '#00FF00',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bssidText: {
    color: '#888888',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  signalIndicator: {
    alignItems: 'flex-end',
    gap: 4,
  },
  signalText: {
    color: '#00FFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  signalBars: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
  },
  signalBar: {
    width: 3,
    borderRadius: 1,
  },
  targetDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomColor: '#ffffff22',
    borderBottomWidth: 1,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    color: '#888888',
    fontSize: 10,
  },
  detailValue: {
    color: '#00FF00',
    fontSize: 11,
    fontWeight: 'bold',
  },
  targetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 4,
    gap: 4,
  },
  deauthBtn: {
    backgroundColor: '#FF0055',
  },
  actionBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0a0e27',
    borderTopColor: '#00FF00',
    borderTopWidth: 2,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#333333',
    borderBottomWidth: 1,
  },
  modalTitle: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalBody: {
    padding: 16,
  },
  configSection: {
    marginBottom: 20,
  },
  configLabel: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  configValue: {
    color: '#00FF00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelBtn: {
    width: '22%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  channelBtnActive: {
    borderColor: '#00FF00',
    backgroundColor: '#00FF0022',
  },
  channelBtnText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  channelBtnTextActive: {
    color: '#00FF00',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#1a1f3a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#00FF00',
    borderRadius: 3,
  },
  aggressionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  aggressionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  aggressionBtnActive: {
    borderColor: '#00FF00',
    backgroundColor: '#00FF0022',
  },
  aggressionBtnText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  aggressionBtnTextActive: {
    color: '#00FF00',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopColor: '#333333',
    borderTopWidth: 1,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalBtnCancel: {
    borderColor: '#FF0055',
    borderWidth: 1,
  },
  modalBtnSave: {
    backgroundColor: '#00FF00',
  },
  modalBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
});
