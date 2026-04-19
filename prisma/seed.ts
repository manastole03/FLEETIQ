import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding FleetIQ database...");

  await prisma.alert.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.load.deleteMany();
  await prisma.driver.deleteMany();

  // ── Drivers ──────────────────────────────────────────────────────────────
  const drivers = await prisma.driver.createMany({
    data: [
      {
        name: "Carlos Mendez",
        phone: "+16025550101",
        licenseNumber: "AZ-CDL-4821",
        truckNumber: "TP-101",
        city: "Phoenix",
        state: "AZ",
        latitude: 33.4484,
        longitude: -112.074,
        status: "AVAILABLE",
        hosRemaining: 10.5,
        fuelLevel: 78,
        onTimeRate: 0.96,
        totalTrips: 312,
        totalMiles: 284000,
        truckHeight: 13.5,
        truckWeight: 78000,
        lastPingAt: new Date(),
      },
      {
        name: "Devon Riley",
        phone: "+16025550102",
        licenseNumber: "AZ-CDL-4822",
        truckNumber: "TP-102",
        city: "Mesa",
        state: "AZ",
        latitude: 33.4152,
        longitude: -111.831,
        status: "AVAILABLE",
        hosRemaining: 8.0,
        fuelLevel: 55,
        onTimeRate: 0.91,
        totalTrips: 198,
        totalMiles: 176000,
        truckHeight: 13.6,
        truckWeight: 79500,
        lastPingAt: new Date(),
      },
      {
        name: "Raj Patel",
        phone: "+16025550103",
        licenseNumber: "AZ-CDL-4823",
        truckNumber: "TP-103",
        city: "Tucson",
        state: "AZ",
        latitude: 32.2226,
        longitude: -110.9747,
        status: "AVAILABLE",
        hosRemaining: 11.0,
        fuelLevel: 90,
        onTimeRate: 0.89,
        totalTrips: 145,
        totalMiles: 128000,
        truckHeight: 13.4,
        truckWeight: 76000,
        lastPingAt: new Date(),
      },
      {
        name: "Maria Torres",
        phone: "+16025550104",
        licenseNumber: "AZ-CDL-4824",
        truckNumber: "TP-104",
        city: "Tempe",
        state: "AZ",
        latitude: 33.4255,
        longitude: -111.94,
        status: "AVAILABLE",
        hosRemaining: 3.5,
        fuelLevel: 40,
        onTimeRate: 0.94,
        totalTrips: 267,
        totalMiles: 241000,
        truckHeight: 13.6,
        truckWeight: 80000,
        lastPingAt: new Date(),
      },
      {
        name: "Luis Gonzalez",
        phone: "+16025550105",
        licenseNumber: "AZ-CDL-4825",
        truckNumber: "TP-105",
        city: "Flagstaff",
        state: "AZ",
        latitude: 35.1983,
        longitude: -111.6513,
        status: "AVAILABLE",
        hosRemaining: 9.0,
        fuelLevel: 65,
        onTimeRate: 0.88,
        totalTrips: 189,
        totalMiles: 167000,
        truckHeight: 13.5,
        truckWeight: 77000,
        lastPingAt: new Date(),
      },
      {
        name: "Tanya Williams",
        phone: "+16025550106",
        licenseNumber: "AZ-CDL-4826",
        truckNumber: "TP-106",
        city: "Scottsdale",
        state: "AZ",
        latitude: 33.4942,
        longitude: -111.9261,
        status: "RESTING",
        hosRemaining: 2.0,
        fuelLevel: 72,
        onTimeRate: 0.97,
        totalTrips: 344,
        totalMiles: 312000,
        truckHeight: 13.6,
        truckWeight: 79000,
        lastPingAt: new Date(),
      },
    ],
  });

  console.log(`✅ Created ${drivers.count} drivers`);

  // ── Loads ─────────────────────────────────────────────────────────────────
  const loads = await prisma.load.createMany({
    data: [
      {
        loadNumber: "LOAD-4821",
        status: "PENDING",
        originCity: "Phoenix",
        originState: "AZ",
        originLat: 33.4484,
        originLng: -112.074,
        originAddress: "2700 Sky Harbor Blvd, Phoenix, AZ 85034",
        destCity: "Dallas",
        destState: "TX",
        destLat: 32.7767,
        destLng: -96.797,
        destAddress: "2626 Cole Ave, Dallas, TX 75204",
        rate: 2400,
        estimatedMiles: 1072,
        commodity: "Retail Merchandise",
        weight: 42000,
        shipper: "Walmart",
        pickupDate: new Date(Date.now() + 6 * 3600000),
        deliveryDate: new Date(Date.now() + 26 * 3600000),
      },
      {
        loadNumber: "LOAD-4822",
        status: "PENDING",
        originCity: "Tucson",
        originState: "AZ",
        originLat: 32.2226,
        originLng: -110.9747,
        originAddress: "1600 S Country Club Rd, Tucson, AZ 85713",
        destCity: "Los Angeles",
        destState: "CA",
        destLat: 34.0522,
        destLng: -118.2437,
        destAddress: "600 S Alameda St, Los Angeles, CA 90021",
        rate: 1850,
        estimatedMiles: 487,
        commodity: "Building Materials",
        weight: 38000,
        shipper: "Home Depot",
        pickupDate: new Date(Date.now() + 4 * 3600000),
        deliveryDate: new Date(Date.now() + 16 * 3600000),
      },
      {
        loadNumber: "LOAD-4823",
        status: "PENDING",
        originCity: "Flagstaff",
        originState: "AZ",
        originLat: 35.1983,
        originLng: -111.6513,
        originAddress: "200 E Route 66, Flagstaff, AZ 86001",
        destCity: "Denver",
        destState: "CO",
        destLat: 39.7392,
        destLng: -104.9903,
        destAddress: "4700 Globeville Rd, Denver, CO 80216",
        rate: 3100,
        estimatedMiles: 669,
        commodity: "E-commerce Parcels",
        weight: 35000,
        shipper: "Amazon",
        pickupDate: new Date(Date.now() + 8 * 3600000),
        deliveryDate: new Date(Date.now() + 22 * 3600000),
      },
    ],
  });

  console.log(`✅ Created ${loads.count} loads`);

  // ── HOS Alert ─────────────────────────────────────────────────────────────
  const tanyaDriver = await prisma.driver.findFirst({
    where: { name: "Tanya Williams" },
  });
  if (tanyaDriver) {
    await prisma.alert.create({
      data: {
        type: "HOS_CRITICAL",
        severity: "CRITICAL",
        title: "HOS Critical — Tanya Williams",
        message:
          "Driver has only 2.0h HOS remaining. Cannot be assigned any load over 110 miles without mandatory 10h restart.",
        driverId: tanyaDriver.id,
        resolved: false,
      },
    });
  }

  const mariaDriver = await prisma.driver.findFirst({
    where: { name: "Maria Torres" },
  });
  if (mariaDriver) {
    await prisma.alert.create({
      data: {
        type: "HOS_WARNING",
        severity: "WARNING",
        title: "HOS Warning — Maria Torres",
        message:
          "Driver has 3.5h HOS remaining. Can accept short loads only. Recommend rest before next major assignment.",
        driverId: mariaDriver.id,
        resolved: false,
      },
    });
  }

  console.log("✅ Created compliance alerts");
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
