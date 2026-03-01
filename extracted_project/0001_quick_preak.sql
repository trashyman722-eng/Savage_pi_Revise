CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`severity` enum('critical','high','medium','low','info') NOT NULL DEFAULT 'info',
	`description` longtext,
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceId` int NOT NULL,
	`username` varchar(255) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`discoveryMethod` varchar(100),
	`discoveryTime` timestamp NOT NULL DEFAULT (now()),
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cpuUsage` decimal(5,2),
	`memoryUsage` decimal(5,2),
	`temperature` decimal(5,2),
	`batteryLevel` decimal(5,2),
	`operationalMode` enum('hunting','raid','idle','charging') NOT NULL DEFAULT 'idle',
	`isConnected` boolean NOT NULL DEFAULT true,
	`lastUpdate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handshakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`huntingSessionId` int NOT NULL,
	`ssid` varchar(255) NOT NULL,
	`bssid` varchar(17) NOT NULL,
	`signalStrength` int,
	`wpaVersion` varchar(10),
	`captureTime` timestamp NOT NULL DEFAULT (now()),
	`filePath` text,
	`crackStatus` enum('captured','uploading','cracking','cracked','failed') NOT NULL DEFAULT 'captured',
	`crackedPassword` varchar(255),
	`crackMethod` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handshakes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hunting_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`startTime` timestamp NOT NULL DEFAULT (now()),
	`endTime` timestamp,
	`targetArea` varchar(255),
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`handshakesCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hunting_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `network_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ipAddress` varchar(45) NOT NULL,
	`hostname` varchar(255),
	`macAddress` varchar(17),
	`discoveryTime` timestamp NOT NULL DEFAULT (now()),
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`status` enum('active','inactive','compromised') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `network_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raid_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`networkTargetId` int NOT NULL,
	`startTime` timestamp NOT NULL DEFAULT (now()),
	`endTime` timestamp,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`servicesFound` int NOT NULL DEFAULT 0,
	`vulnerabilitiesFound` int NOT NULL DEFAULT 0,
	`credentialsFound` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `raid_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`networkTargetId` int NOT NULL,
	`port` int NOT NULL,
	`protocol` varchar(10) NOT NULL,
	`serviceName` varchar(100),
	`version` varchar(100),
	`state` enum('open','closed','filtered') NOT NULL DEFAULT 'open',
	`discoveryTime` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vulnerabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceId` int NOT NULL,
	`cveId` varchar(20),
	`cweId` varchar(20),
	`title` varchar(255) NOT NULL,
	`description` longtext,
	`cvssScore` decimal(3,1),
	`severity` enum('critical','high','medium','low','info') NOT NULL,
	`remediation` longtext,
	`discoveryTime` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vulnerabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `activity_log_userId_idx` ON `activity_log` (`userId`);--> statement-breakpoint
CREATE INDEX `activity_log_eventType_idx` ON `activity_log` (`eventType`);--> statement-breakpoint
CREATE INDEX `activity_log_createdAt_idx` ON `activity_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `credentials_serviceId_idx` ON `credentials` (`serviceId`);--> statement-breakpoint
CREATE INDEX `device_status_userId_idx` ON `device_status` (`userId`);--> statement-breakpoint
CREATE INDEX `handshakes_huntingSessionId_idx` ON `handshakes` (`huntingSessionId`);--> statement-breakpoint
CREATE INDEX `handshakes_bssid_idx` ON `handshakes` (`bssid`);--> statement-breakpoint
CREATE INDEX `hunting_sessions_userId_idx` ON `hunting_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `network_targets_userId_idx` ON `network_targets` (`userId`);--> statement-breakpoint
CREATE INDEX `network_targets_ipAddress_idx` ON `network_targets` (`ipAddress`);--> statement-breakpoint
CREATE INDEX `raid_sessions_userId_idx` ON `raid_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `raid_sessions_networkTargetId_idx` ON `raid_sessions` (`networkTargetId`);--> statement-breakpoint
CREATE INDEX `services_networkTargetId_idx` ON `services` (`networkTargetId`);--> statement-breakpoint
CREATE INDEX `services_port_idx` ON `services` (`port`);--> statement-breakpoint
CREATE INDEX `vulnerabilities_serviceId_idx` ON `vulnerabilities` (`serviceId`);--> statement-breakpoint
CREATE INDEX `vulnerabilities_cveId_idx` ON `vulnerabilities` (`cveId`);