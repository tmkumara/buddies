/*
  Warnings:

  - You are about to alter the column `created_at` on the `box_design` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `box_design` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `customer_order` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `customer_order` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `design_type` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `design_type` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `material` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `material` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `box_design` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `customer` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `customer_order` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `design_type` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `material` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NOT NULL;
