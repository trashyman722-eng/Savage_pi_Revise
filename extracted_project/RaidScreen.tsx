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
  Alert,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import { useAppStore } from '@store/appStore';
import { wsService } from '@services/websocket';

const screenWidth = Dimensions.get('window').width;

interface DiscoveredHost {
  id: string;
  ip: string;
  hostname?: string;
  mac: string;
  services: number;
  vulnerabilities: number;
  openPorts: Array<{
    port: number;
    service: string;
    version?: string;
    state: 'open' | 'filtered' | 'closed';
  }>;
}

export default function RaidScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHost, setSelectedHost] = useState<DiscoveredHost | null>(null);
  const [showHostDetail, setShowHostDetail] = useState(false);
  const [showScanConfig, setShowScanConfig] = useState(false);
  const [scanConfig, setScanConfig] = useState({
    scanType: 'standard',
    portRange: '1-65535',
    timeout: 30,
  });

  const raidStatus = useAppStore((state) => state.raidStatus);
  const discoveredHosts = useAppStore((state) => state.discoveredHosts);
  const addActivityLog = useAppStore((state) => state.addActivityLog);
  const setRaidStatus = useAppStore((state) => state.setRaidStatus);
  const addDiscoveredHost = useAppStore((state) => state.addDiscoveredHost);

  useEffect(() => {
    wsService.requestRaidStatus();

    const raidStatusListener = (data: any) => {
      setRaidStatus(data);
    };

    const raidEventListener = (data: any) => {
      if (data.type === 'host_discovered') {
        addDiscoveredHost(data.host);
        addActivityLog({
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          type: 'raid',
          severity: 'info',
          message: `Host discovered: ${data.host.ip}`,
        });
      } else if (data.type === 'service_found') {
        addActivityLog({
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          type: 'service',
          severity: 'info',
          message: `Service found: ${data.service.name} on ${data.host}:${data.service.port}`,
        });
      } else if (data.type === 'vulnerability_detected') {
        addActivityLog({
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          type: 'vulnerability',
          severity: 'warning',
          message: `Vulnerability: ${data.vulnerability.name} (CVSS: ${data.vulnerability.cvss})`,
        });
      }
    };

    wsService.on('raid:status', raidStatusListener);
    wsService.on('raid:event', raidEventListener);

    return () => {
      wsService.off('raid:status', raidStatusListener);
      wsService.off('raid:event', raidEventListener);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    wsService.requestRaidStatus();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStartRaid = () => {
    if (!raidStatus?.targetNetwork) {
      Alert.alert('No Target', 'Please select a target network first');
      return;
    }

    wsService.startRaid(raidStatus.targetNetwork, scanConfig.scanType);
    addActivityLog({
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      type: 'raid',
      severity: 'warning',
      message: `Raid started on ${raidStatus.targetNetwork} (${scanConfig.scanType} scan)`,
    });
  };

  const handlePauseRaid = () => {
    wsService.pauseRaid();
    addActivityLog({
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      type: 'raid',
      severity: 'warning',
      message: 'Raid paused',
    });
  };

  const handleResumeRaid = () => {
    wsService.resumeRaid();
    addActivityLog({
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      type: 'raid',
      severity: 'info',
      message: 'Raid resumed',
    });
  };

  const handleStopRaid = () => {
    Alert.alert('Stop Raid', 'Are you sure you want to stop the raid?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Stop',
        onPress: () => {
          wsService.stopRaid();
          addActivityLog({
            id: `log-${Date.now()}`,
            timestamp: Date.now(),
            type: 'raid',
            severity: 'warning',
            message: 'Raid stopped',
          });
        },
      },
    ]);
  };

  const getCVSSColor = (cvss: number) => {
    if (cvss >= 9) return '#FF0055';
    if (cvss >= 7) return '#FF6600';
    if (cvss >= 4) return '#FFAA00';
    return '#00FF00';
  };

  const renderHost = ({ item }: { item: DiscoveredHost }) => (
    <TouchableOpacity
      style={styles.hostCard}
      onPress={() => {
        setSelectedHost(item);
        setShowHostDetail(true);
      }}
    >
      <LinearGradient
        colors={['#FF005533', '#FF005511']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hostGradient}
      >
        <View style={styles.hostHeader}>
          <View style={styles.hostInfo}>
            <View style={styles.ipRow}>
              <MaterialCommunityIcons name="server" size={16} color="#FF0055" />
              <Text style={styles.ipText}>{item.ip}</Text>
            </View>
            {item.hostname && <Text style={styles.hostnameText}>{item.hostname}</Text>}
            <Text style={styles.macText}>{item.mac}</Text>
          </View>
          <View style={styles.hostStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Services</Text>
              <Text style={styles.statValue}>{item.services}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Vulns</Text>
              <Text style={[styles.statValue, { color: '#FF0055' }]}>
                {item.vulnerabilities}
              </Text>
            </View>
          </View>
        </View>

        {item.openPorts.length > 0 && (
          <View style={styles.portsPreview}>
            <Text style={styles.portsLabel}>Open Ports:</Text>
            <View style={styles.portsList}>
              {item.openPorts.slice(0, 3).map((port) => (
                <View key={port.port} style={styles.portBadge}>
                  <Text style={styles.portText}>
                    {port.port}/{port.service}
                  </Text>
                </View>
              ))}
              {item.openPorts.length > 3 && (
                <View style={styles.portBadge}>
                  <Text style={styles.portText}>+{item.openPorts.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
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
                  raidStatus?.state === 'raiding'
                    ? '#FF0055'
                    : raidStatus?.state === 'paused'
                      ? '#FFAA00'
                      : '#666666',
              },
            ]}
          >
            {raidStatus?.state.toUpperCase() || 'IDLE'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Target:</Text>
          <Text style={styles.statusValue}>{raidStatus?.targetNetwork || 'None'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Hosts:</Text>
          <Text style={styles.statusValue}>{raidStatus?.hostsDiscovered || 0}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Services:</Text>
          <Text style={styles.statusValue}>{raidStatus?.servicesFound || 0}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Vulnerabilities:</Text>
          <Text style={[styles.statusValue, { color: '#FF0055' }]}>
            {raidStatus?.vulnerabilitiesFound || 0}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      {raidStatus && (
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Scan Progress</Text>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (discoveredHosts.length / Math.max(raidStatus.hostsDiscovered, 1)) * 100,
                    100
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {discoveredHosts.length} of {raidStatus.hostsDiscovered} hosts enumerated
          </Text>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsCard}>
        <View style={styles.buttonRow}>
          {raidStatus?.state === 'idle' ? (
            <TouchableOpacity
              style={[styles.controlBtn, styles.startBtn]}
              onPress={handleStartRaid}
            >
              <MaterialCommunityIcons name="play" size={20} color="#000000" />
              <Text style={styles.controlBtnText}>Start</Text>
            </TouchableOpacity>
          ) : raidStatus?.state === 'raiding' ? (
            <>
              <TouchableOpacity
                style={[styles.controlBtn, styles.pauseBtn]}
                onPress={handlePauseRaid}
              >
                <MaterialCommunityIcons name="pause" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, styles.stopBtn]}
                onPress={handleStopRaid}
              >
                <MaterialCommunityIcons name="stop" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Stop</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.controlBtn, styles.resumeBtn]}
                onPress={handleResumeRaid}
              >
                <MaterialCommunityIcons name="play" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlBtn, styles.stopBtn]}
                onPress={handleStopRaid}
              >
                <MaterialCommunityIcons name="stop" size={20} color="#000000" />
                <Text style={styles.controlBtnText}>Stop</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.configBtn}
          onPress={() => setShowScanConfig(true)}
        >
          <MaterialCommunityIcons name="cog" size={18} color="#FF0055" />
          <Text style={styles.configBtnText}>Configure</Text>
        </TouchableOpacity>
      </View>

      {/* Hosts List */}
      <View style={styles.hostsHeader}>
        <Text style={styles.hostsTitle}>Discovered Hosts ({discoveredHosts.length})</Text>
      </View>

      {discoveredHosts.length > 0 ? (
        <FlatList
          data={discoveredHosts}
          renderItem={renderHost}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.hostsList}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="server-off" size={48} color="#666666" />
          <Text style={styles.emptyStateText}>
            {raidStatus?.state === 'raiding'
              ? 'Scanning network...'
              : 'Start a raid to discover hosts'}
          </Text>
        </View>
      )}

      {/* Scan Configuration Modal */}
      <Modal
        visible={showScanConfig}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScanConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raid Configuration</Text>
              <TouchableOpacity onPress={() => setShowScanConfig(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FF0055" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Scan Type */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>Scan Type</Text>
                <View style={styles.scanTypeButtons}>
                  {['quick', 'standard', 'thorough'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.scanTypeBtn,
                        scanConfig.scanType === type && styles.scanTypeBtnActive,
                      ]}
                      onPress={() =>
                        setScanConfig((prev) => ({ ...prev, scanType: type }))
                      }
                    >
                      <Text
                        style={[
                          styles.scanTypeBtnText,
                          scanConfig.scanType === type &&
                            styles.scanTypeBtnTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Port Range */}
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>Port Range</Text>
                <View style={styles.portRangeButtons}>
                  {['1-1024', '1-65535', 'common'].map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.portRangeBtn,
                        scanConfig.portRange === range && styles.portRangeBtnActive,
                      ]}
                      onPress={() =>
                        setScanConfig((prev) => ({ ...prev, portRange: range }))
                      }
                    >
                      <Text
                        style={[
                          styles.portRangeBtnText,
                          scanConfig.portRange === range &&
                            styles.portRangeBtnTextActive,
                        ]}
                      >
                        {range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Timeout */}
              <View style={styles.configSection}>
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Timeout (seconds)</Text>
                  <Text style={styles.configValue}>{scanConfig.timeout}s</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      setScanConfig((prev) => ({
                        ...prev,
                        timeout: Math.max(10, prev.timeout - 10),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="minus" size={24} color="#FF0055" />
                  </TouchableOpacity>
                  <View style={styles.sliderBar}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${(scanConfig.timeout / 120) * 100}%` },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setScanConfig((prev) => ({
                        ...prev,
                        timeout: Math.min(120, prev.timeout + 10),
                      }))
                    }
                  >
                    <MaterialCommunityIcons name="plus" size={24} color="#FF0055" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowScanConfig(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={() => setShowScanConfig(false)}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Host Detail Modal */}
      <Modal
        visible={showHostDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHostDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Host Details</Text>
              <TouchableOpacity onPress={() => setShowHostDetail(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FF0055" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedHost && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Host Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>IP Address:</Text>
                      <Text style={styles.detailValue}>{selectedHost.ip}</Text>
                    </View>
                    {selectedHost.hostname && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Hostname:</Text>
                        <Text style={styles.detailValue}>{selectedHost.hostname}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>MAC Address:</Text>
                      <Text style={styles.detailValue}>{selectedHost.mac}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Services ({selectedHost.openPorts.length})</Text>
                    {selectedHost.openPorts.map((port) => (
                      <View key={port.port} style={styles.serviceItem}>
                        <View style={styles.serviceHeader}>
                          <Text style={styles.servicePort}>{port.port}</Text>
                          <Text style={styles.serviceName}>{port.service}</Text>
                          <View
                            style={[
                              styles.serviceState,
                              {
                                backgroundColor:
                                  port.state === 'open'
                                    ? '#00FF0044'
                                    : port.state === 'filtered'
                                      ? '#FFAA0044'
                                      : '#FF005544',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.serviceStateText,
                                {
                                  color:
                                    port.state === 'open'
                                      ? '#00FF00'
                                      : port.state === 'filtered'
                                        ? '#FFAA00'
                                        : '#FF0055',
                                },
                              ]}
                            >
                              {port.state}
                            </Text>
                          </View>
                        </View>
                        {port.version && (
                          <Text style={styles.serviceVersion}>{port.version}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnClose]}
                onPress={() => setShowHostDetail(false)}
              >
                <Text style={styles.modalBtnText}>Close</Text>
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
    borderColor: '#FF0055',
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
    color: '#FF0055',
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
    color: '#FF0055',
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
    backgroundColor: '#FF0055',
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
    backgroundColor: '#FF0055',
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
    borderColor: '#FF0055',
    borderWidth: 1,
    borderRadius: 6,
    gap: 6,
  },
  configBtnText: {
    color: '#FF0055',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hostsHeader: {
    marginBottom: 12,
  },
  hostsTitle: {
    color: '#FF0055',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  hostsList: {
    marginBottom: 32,
  },
  hostCard: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  hostGradient: {
    padding: 12,
  },
  hostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hostInfo: {
    flex: 1,
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ipText: {
    color: '#FF0055',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  hostnameText: {
    color: '#00FFFF',
    fontSize: 11,
  },
  macText: {
    color: '#888888',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  hostStats: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#888888',
    fontSize: 10,
  },
  statValue: {
    color: '#00FF00',
    fontSize: 13,
    fontWeight: 'bold',
  },
  portsPreview: {
    paddingTop: 12,
    borderTopColor: '#ffffff22',
    borderTopWidth: 1,
  },
  portsLabel: {
    color: '#888888',
    fontSize: 10,
    marginBottom: 6,
  },
  portsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  portBadge: {
    backgroundColor: '#00FF0022',
    borderColor: '#00FF00',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  portText: {
    color: '#00FF00',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'monospace',
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
    borderTopColor: '#FF0055',
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
    color: '#FF0055',
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
    color: '#FF0055',
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
    color: '#FF0055',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scanTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scanTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  scanTypeBtnActive: {
    borderColor: '#FF0055',
    backgroundColor: '#FF005522',
  },
  scanTypeBtnText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scanTypeBtnTextActive: {
    color: '#FF0055',
  },
  portRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  portRangeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  portRangeBtnActive: {
    borderColor: '#FF0055',
    backgroundColor: '#FF005522',
  },
  portRangeBtnText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  portRangeBtnTextActive: {
    color: '#FF0055',
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
    backgroundColor: '#FF0055',
    borderRadius: 3,
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: '#1a1f3a',
    borderRadius: 6,
    padding: 12,
  },
  detailSectionTitle: {
    color: '#FF0055',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: '#333333',
    borderBottomWidth: 1,
  },
  detailLabel: {
    color: '#888888',
    fontSize: 11,
  },
  detailValue: {
    color: '#00FF00',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  serviceItem: {
    backgroundColor: '#0a0e27',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicePort: {
    color: '#00FFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  serviceName: {
    color: '#00FF00',
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  serviceState: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  serviceStateText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  serviceVersion: {
    color: '#888888',
    fontSize: 9,
    marginTop: 4,
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
    backgroundColor: '#FF0055',
  },
  modalBtnClose: {
    backgroundColor: '#FF0055',
  },
  modalBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
});
