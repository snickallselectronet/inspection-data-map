import json

# Read the JSON file
with open('points.json', 'r') as file:
    data = json.load(file)

# Loop through all objects and add colour key
for obj in data:
    obj['colour'] = 'blue'

# Write the updated JSON back to file
with open('points.json', 'w') as file:
    json.dump(data, file, indent=4)

print(f"Successfully added 'colour': 'blue' to {len(data)} objects")

# Optional: Create a backup file with the updated data
with open('points_with_colors.json', 'w') as file:
    json.dump(data, file, indent=4)

print("Backup file 'points_with_colors.json' created")