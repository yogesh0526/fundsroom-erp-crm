ALTER TABLE inventory 
  ADD CONSTRAINT check_physical_non_neg CHECK ("physicalQuantity" >= 0),
  ADD CONSTRAINT check_reserved_non_neg CHECK ("reservedQuantity" >= 0),
  ADD CONSTRAINT check_damaged_non_neg CHECK ("damagedQuantity" >= 0),
  ADD CONSTRAINT check_reserved_limit CHECK ("reservedQuantity" + "damagedQuantity" <= "physicalQuantity");
