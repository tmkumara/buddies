-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'STAFF',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(150) NULL,
    `address_line` VARCHAR(255) NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `design_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `image_url` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `design_type_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `gsm` INTEGER NOT NULL,
    `sheet_length_cm` DECIMAL(8, 2) NOT NULL,
    `sheet_width_cm` DECIMAL(8, 2) NOT NULL,
    `cost_per_sheet` DECIMAL(10, 2) NOT NULL,
    `min_stock_level` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `material_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `box_design` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `design_type_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `length_cm` DECIMAL(8, 2) NOT NULL,
    `width_cm` DECIMAL(8, 2) NOT NULL,
    `height_cm` DECIMAL(8, 2) NOT NULL,
    `cut_length_cm` DECIMAL(8, 2) NOT NULL,
    `cut_width_cm` DECIMAL(8, 2) NOT NULL,
    `raw_area_sq_cm` DECIMAL(12, 2) NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `design_file_path` VARCHAR(255) NULL,
    `is_custom` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `box_design_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(50) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `order_date` DATE NOT NULL,
    `delivery_date` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `remarks` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `customer_order_order_no_key`(`order_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `box_design_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `line_total` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `box_design` ADD CONSTRAINT `box_design_design_type_id_fkey` FOREIGN KEY (`design_type_id`) REFERENCES `design_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `box_design` ADD CONSTRAINT `box_design_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_order` ADD CONSTRAINT `customer_order_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_box_design_id_fkey` FOREIGN KEY (`box_design_id`) REFERENCES `box_design`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
