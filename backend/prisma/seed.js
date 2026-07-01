const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database seeding started ---');

  // 1. Clean up existing data in correct dependency order
  console.log('Cleaning up existing data...');
  await prisma.auditLog.deleteMany({});
  await prisma.kitchenTicket.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.restaurantSetting.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.restaurant.deleteMany({});

  // Hash password for default users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Reset_xhjzc6bn', salt);

  // 2. Create Super Admin User (Not bound to any restaurant)
  const superAdmin = await prisma.user.create({
    data: {
      fullName: 'SaaS Super Admin',
      email: 'superadmin@platform.com',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`Created Super Admin: ${superAdmin.email}`);

  // 3. Create Restaurant
  const restaurantId = '550e8400-e29b-41d4-a716-446655440000';
  const restaurant = await prisma.restaurant.create({
    data: {
      id: restaurantId,
      name: 'Tandoori Palace',
      slug: 'tandoori-palace',
      logoUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=100',
      ownerName: 'Vikram Singh',
      ownerEmail: 'vikram@tandooripalace.com',
      phone: '+919876543210',
      address: 'Park Street 12, Kolkata, West Bengal, India',
      subscriptionStatus: 'active',
      isActive: true,
    },
  });
  console.log(`Created Restaurant: ${restaurant.name} (${restaurant.id})`);

  // 4. Create Restaurant Admin User
  const restaurantAdmin = await prisma.user.create({
    data: {
      restaurantId: restaurantId,
      fullName: 'Vikram Singh (Admin)',
      email: 'admin@tandooripalace.com',
      passwordHash: adminPasswordHash,
      role: 'RESTAURANT_ADMIN',
      isActive: true,
    },
  });
  console.log(`Created Restaurant Admin: ${restaurantAdmin.email}`);

  // 5. Create Restaurant Settings
  const settings = await prisma.restaurantSetting.create({
    data: {
      restaurantId: restaurantId,
      isVegOnly: false,
      allowUpiPayments: true,
      allowWaiterCall: true,
      cgstRate: 2.5,
      sgstRate: 2.5,
      serviceChargeRate: 5.0,
    },
  });
  console.log('Created Restaurant Settings');

  // 6. Create Tables
  const t1 = await prisma.table.create({
    data: { id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', restaurantId, name: 'T1', status: 'VACANT' },
  });
  const t2 = await prisma.table.create({
    data: { id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', restaurantId, name: 'T2', status: 'OCCUPIED' },
  });
  const t3 = await prisma.table.create({
    data: { id: '6c84cfa3-e7a1-43bb-a53f-7f1542f7be41', restaurantId, name: 'T3', status: 'VACANT' },
  });
  console.log('Created Dining Tables: T1, T2, T3');

  // 7. Create Menu Categories
  const catStarters = await prisma.menuCategory.create({
    data: { id: 'a1111111-1111-1111-1111-111111111111', restaurantId, name: 'Starters', description: 'Appetizers and quick bites to start your meal.', imageUrl: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=300', sortOrder: 1, isAvailable: true },
  });
  const catMains = await prisma.menuCategory.create({
    data: { id: 'b2222222-2222-2222-2222-222222222222', restaurantId, name: 'Main Course', description: 'Hearty and delicious traditional Indian entrees.', imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300', sortOrder: 2, isAvailable: true },
  });
  const catBreads = await prisma.menuCategory.create({
    data: { id: 'c3333333-3333-3333-3333-333333333333', restaurantId, name: 'Indian Breads', description: 'Freshly baked tandoori breads, naans, and rotis.', imageUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=300', sortOrder: 3, isAvailable: true },
  });
  const catDrinks = await prisma.menuCategory.create({
    data: { id: 'd4444444-4444-4444-4444-444444444444', restaurantId, name: 'Beverages', description: 'Refreshing cold drinks, juices, and lassis.', imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300', sortOrder: 4, isAvailable: true },
  });
  console.log('Created Menu Categories');

  // 8. Create Menu Items
  // Paneer Tikka Multani
  const paneerTikka = await prisma.menuItem.create({
    data: {
      id: 'e1111111-1111-1111-1111-111111111111',
      restaurantId,
      categoryId: catStarters.id,
      name: 'Paneer Tikka Multani',
      description: 'Fresh cottage cheese blocks marinated in yellow yogurt spice blend, grilled in tandoor.',
      price: 320,
      discountPrice: 299,
      isVeg: true,
      foodType: 'VEG',
      prepTime: 15,
      isAvailable: true,
      isFeatured: true,
      isBestseller: true,
      imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500',
    },
  });

  // Murgh Malai Kabab
  await prisma.menuItem.create({
    data: {
      id: 'e2222222-2222-2222-2222-222222222222',
      restaurantId,
      categoryId: catStarters.id,
      name: 'Murgh Malai Kabab',
      description: 'Boneless chicken thighs marinated in cream, cheese, and cardamom, cooked in clay oven.',
      price: 380,
      discountPrice: 349,
      isVeg: false,
      foodType: 'NON_VEG',
      prepTime: 20,
      isAvailable: true,
      isFeatured: true,
      isBestseller: false,
      imageUrl: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500',
    },
  });

  // Dal Makhani Bukhara
  await prisma.menuItem.create({
    data: {
      id: 'f1111111-1111-1111-1111-111111111111',
      restaurantId,
      categoryId: catMains.id,
      name: 'Dal Makhani Bukhara',
      description: 'Overnight slow-cooked black lentils, enriched with churned white butter and fresh cream.',
      price: 390,
      isVeg: true,
      foodType: 'VEG',
      prepTime: 25,
      isAvailable: true,
      isFeatured: false,
      isBestseller: true,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500',
    },
  });

  // Butter Naan
  const butterNaan = await prisma.menuItem.create({
    data: {
      id: 'c1111111-1111-1111-1111-111111111111',
      restaurantId,
      categoryId: catBreads.id,
      name: 'Butter Naan',
      description: 'Leavened flatbread baked in tandoor, topped with soft white butter.',
      price: 70,
      isVeg: true,
      foodType: 'VEG',
      prepTime: 8,
      isAvailable: true,
      isFeatured: false,
      isBestseller: true,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500',
    },
  });

  // Masala Shikanji
  await prisma.menuItem.create({
    data: {
      id: 'd1111111-1111-1111-1111-111111111111',
      restaurantId,
      categoryId: catDrinks.id,
      name: 'Masala Shikanji',
      description: 'Refreshing traditional Indian lemonade made with freshly squeezed lemons, mint, spices.',
      price: 90,
      isVeg: true,
      foodType: 'VEG',
      prepTime: 5,
      isAvailable: true,
      isFeatured: false,
      isBestseller: false,
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500',
    },
  });

  console.log('Created Menu Items');

  // 9. Create Menu Variants
  await prisma.menuVariant.createMany({
    data: [
      { menuItemId: paneerTikka.id, name: 'Regular Portion', price: 320, sortOrder: 1, isActive: true },
      { menuItemId: paneerTikka.id, name: 'Large Portion (Serves 2-3)', price: 480, sortOrder: 2, isActive: true },
      { menuItemId: butterNaan.id, name: 'Single Roti', price: 70, sortOrder: 1, isActive: true },
    ]
  });
  console.log('Created Menu Variants');

  // 10. Create Menu Addons
  await prisma.menuAddon.createMany({
    data: [
      { menuItemId: paneerTikka.id, name: 'Extra Mint Chutney', price: 20, isActive: true },
      { menuItemId: paneerTikka.id, name: 'Spiced Salad Mix', price: 30, isActive: true },
      { menuItemId: butterNaan.id, name: 'Extra Churned White Butter', price: 15, isActive: true }
    ]
  });
  console.log('Created Menu Addons');

  // 11. Create Sample/Fake Orders for Dashboard
  console.log('Creating sample orders...');
  
  // Update Table T1 status to OCCUPIED as well so Table Occupancy becomes 2 / 3
  await prisma.table.update({
    where: { id: t1.id },
    data: { status: 'OCCUPIED' }
  });

  // Order 1 (Preparing on Table T1)
  const order1 = await prisma.order.create({
    data: {
      id: 'd1111111-1111-1111-1111-111111111112',
      restaurantId,
      tableId: t1.id,
      kotNumber: '#1001',
      status: 'preparing',
      subtotal: 710,
      cgst: 17.75,
      sgst: 17.75,
      serviceCharge: 35.50,
      grandTotal: 781.00,
      specialInstructions: 'Make paneer extra soft.',
      items: {
        create: [
          { menuItemId: paneerTikka.id, name: 'Paneer Tikka Multani', quantity: 2, price: 320, customizations: [] },
          { menuItemId: butterNaan.id, name: 'Butter Naan', quantity: 1, price: 70, customizations: [] }
        ]
      }
    }
  });

  await prisma.kitchenTicket.create({
    data: {
      id: 'b1111111-1111-1111-1111-111111111111',
      restaurantId,
      orderId: order1.id,
      kotNumber: '#1001',
      status: 'preparing'
    }
  });

  // Order 2 (Pending/Confirmed on Table T2)
  const order2 = await prisma.order.create({
    data: {
      id: 'd2222222-2222-2222-2222-222222222223',
      restaurantId,
      tableId: t2.id,
      kotNumber: '#1002',
      status: 'confirmed',
      subtotal: 390,
      cgst: 9.75,
      sgst: 9.75,
      serviceCharge: 19.50,
      grandTotal: 429.00,
      items: {
        create: [
          { menuItemId: 'f1111111-1111-1111-1111-111111111111', name: 'Dal Makhani Bukhara', quantity: 1, price: 390, customizations: [] }
        ]
      }
    }
  });

  await prisma.kitchenTicket.create({
    data: {
      id: 'b2222222-2222-2222-2222-222222222222',
      restaurantId,
      orderId: order2.id,
      kotNumber: '#1002',
      status: 'confirmed'
    }
  });

  // Order 3 (Served order 20 mins ago, completed/ready in 12 mins)
  const now = new Date();
  const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);
  const eightMinsAgo = new Date(now.getTime() - 8 * 60 * 1000);

  const order3 = await prisma.order.create({
    data: {
      id: 'd3333333-3333-3333-3333-333333333334',
      restaurantId,
      tableId: t3.id,
      kotNumber: '#1003',
      status: 'served',
      subtotal: 380,
      cgst: 9.50,
      sgst: 9.50,
      serviceCharge: 19.00,
      grandTotal: 418.00,
      createdAt: twentyMinsAgo,
      items: {
        create: [
          { menuItemId: 'e2222222-2222-2222-2222-222222222222', name: 'Murgh Malai Kabab', quantity: 1, price: 380, customizations: [] }
        ]
      }
    }
  });

  await prisma.kitchenTicket.create({
    data: {
      id: 'b3333333-3333-3333-3333-333333333333',
      restaurantId,
      orderId: order3.id,
      kotNumber: '#1003',
      status: 'served',
      createdAt: twentyMinsAgo,
      updatedAt: eightMinsAgo
    }
  });

  console.log('Created Menu Addons');
  console.log('--- Database seeding completed successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
