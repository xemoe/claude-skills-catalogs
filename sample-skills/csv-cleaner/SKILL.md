---
name: csv-cleaner
description: Clean and normalize messy CSV files — trim whitespace, fix encodings, drop fully empty rows, and standardize header names to snake_case.
allowed-tools: Read, Write, Bash
---

# CSV Cleaner

Normalizes a raw CSV export into a tidy, analysis-ready file.

## Steps

1. Read the source CSV and detect the delimiter and encoding.
2. Standardize headers: lowercase, trim, replace spaces with underscores.
3. Trim leading/trailing whitespace from every cell.
4. Drop rows where every column is empty.
5. Write the cleaned file next to the original with a `.cleaned.csv` suffix.

## Notes

- Never modify the source file in place — always write a new file.
- Preserve the original column order.
