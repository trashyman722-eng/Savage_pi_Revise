import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { CircularProgress } from 'react-native-circular-progress';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppStore } from '@store/appStore';
import { wsService } from '@services/websocket';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const metrics = useAppStore((state) => state.metrics);
  const metricsHistory = useAppStore((state) => state.metricsHistory);
  const huntingStatus = useAppStore((state) => state.huntingStatus);
  const raidStatus = useAppStore((state) => state.raidStatus);
  const isConnected = useAppStore((state) => state.isConnected);
  const setMetrics = useAppStore((state) => state.setMetrics);

  useEffect(() => {
    // Request metrics on mount
    wsService.requestMetrics();

    // Setup metrics listener
    const metricsListener = (data: any) => {
      setMetrics(data);
    };

    wsService.on('metrics', metricsListener);

    return () => {
      wsService.off('metrics', metricsListener);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    wsService.requestMetrics();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const chartData = {
    labels: metricsHistory.slice(-10).map((_, i) => `${i}`),
    datasets: [
      {
        data: metricsHistory.slice(-10).map((m) => m.cpu),
        color: () => '#00FF00',
        strokeWidth: 2,
      },
    ],
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FF00" />}
    >
      {/* Connection Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name={isConnected ? 'wifi-check' : 'wifi-off'}
            size={24}
            color={isConnected ? '#00FF00' : '#FF0055'}
          />
          <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
        </View>
      </View>

      {/* Metrics Grid */}
      {metrics && (
        <View style={styles.metricsGrid}>
          {/* CPU */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>CPU</Text>
            <CircularProgress
              size={100}
              width={8}
              fill={metrics.cpu}
              tintColor="#00FF00"
              backgroundColor="#1a1f3a"
              rotation={0}
              lineCap="round"
            >
              {() => <Text style={styles.metricValue}>{metrics.cpu}%</Text>}
            </CircularProgress>
          </View>

          {/* Memory */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Memory</Text>
            <CircularProgress
              size={100}
              width={8}
              fill={metrics.memory}
              tintColor="#00FFFF"
              backgroundColor="#1a1f3a"
              rotation={0}
              lineCap="round"
            >
              {() => <Text style={styles.metricValue}>{metrics.memory}%</Text>}
            </CircularProgress>
          </View>

          {/* Temperature */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Temp</Text>
            <CircularProgress
              size={100}
              width={8}
              fill={Math.min(metrics.temperature / 100, 1) * 100}
              tintColor={metrics.temperature > 75 ? '#FF0055' : '#FFAA00'}
              backgroundColor="#1a1f3a"
              rotation={0}
              lineCap="round"
            >
              {() => <Text style={styles.metricValue}>{metrics.temperature}°C</Text>}
            </CircularProgress>
          </View>

          {/* Battery */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Battery</Text>
            <CircularProgress
              size={100}
              width={8}
              fill={metrics.battery}
              tintColor={metrics.battery > 30 ? '#00FF00' : '#FF0055'}
              backgroundColor="#1a1f3a"
              rotation={0}
              lineCap="round"
            >
              {() => <Text style={styles.metricValue}>{metrics.battery}%</Text>}
            </CircularProgress>
          </View>
        </View>
      )}

      {/* CPU Trend Chart */}
      {metricsHistory.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>CPU Usage Trend</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#0a0e27',
              backgroundGradientFrom: '#0a0e27',
              backgroundGradientTo: '#0a0e27',
              color: () => '#00FF00',
              strokeWidth: 2,
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#00FF00',
              },
              propsForBackgroundLines: {
                strokeDasharray: '5,5',
                stroke: '#333333',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Hunting Status */}
      {huntingStatus && (
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Hunting Mode</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>State:</Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color:
                    huntingStatus.state === 'hunting'
                      ? '#00FF00'
                      : huntingStatus.state === 'paused'
                        ? '#FFAA00'
                        : '#666666',
                },
              ]}
            >
              {huntingStatus.state.toUpperCase()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Targets:</Text>
            <Text style={styles.statusValue}>{huntingStatus.targetCount}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Handshakes:</Text>
            <Text style={styles.statusValue}>{huntingStatus.handshakesCapture}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Signal:</Text>
            <Text style={styles.statusValue}>{huntingStatus.signalStrength} dBm</Text>
          </View>
        </View>
      )}

      {/* Raid Status */}
      {raidStatus && (
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Raid Mode</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>State:</Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color:
                    raidStatus.state === 'raiding'
                      ? '#FF0055'
                      : raidStatus.state === 'paused'
                        ? '#FFAA00'
                        : '#666666',
                },
              ]}
            >
              {raidStatus.state.toUpperCase()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Network:</Text>
            <Text style={styles.statusValue}>{raidStatus.targetNetwork}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Hosts:</Text>
            <Text style={styles.statusValue}>{raidStatus.hostsDiscovered}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Services:</Text>
            <Text style={styles.statusValue}>{raidStatus.servicesFound}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Vulnerabilities:</Text>
            <Text style={styles.statusValue}>{raidStatus.vulnerabilitiesFound}</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonGreen]}
            onPress={() => wsService.startHunting([1, 6, 11], 'medium')}
          >
            <MaterialCommunityIcons name="play" size={20} color="#000000" />
            <Text style={styles.actionButtonText}>Start Hunt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonRed]}
            onPress={() => wsService.stopHunting()}
          >
            <MaterialCommunityIcons name="stop" size={20} color="#000000" />
            <Text style={styles.actionButtonText}>Stop Hunt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonCyan]}
            onPress={() => wsService.requestMetrics()}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#000000" />
            <Text style={styles.actionButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#0a0e27',
    borderColor: '#00FF00',
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#0a0e27',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  metricValue: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: '#0a0e27',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  chart: {
    borderRadius: 8,
  },
  sectionTitle: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
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
  },
  statusValue: {
    color: '#00FF00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsCard: {
    backgroundColor: '#0a0e27',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  actionButtonGreen: {
    backgroundColor: '#00FF00',
  },
  actionButtonRed: {
    backgroundColor: '#FF0055',
  },
  actionButtonCyan: {
    backgroundColor: '#00FFFF',
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
