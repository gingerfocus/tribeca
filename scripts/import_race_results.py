#!/usr/bin/env python3
import csv
import sys
from datetime import datetime

def parse_time_to_ms(time_str):
    if not time_str or time_str.strip() == '' or time_str.strip() == 'DQ':
        return None
    time_str = time_str.strip()
    try:
        parts = time_str.split(':')
        if len(parts) == 3:
            hours, minutes, seconds = map(int, parts)
            return hours * 3600000 + minutes * 60000 + seconds * 1000
        elif len(parts) == 2:
            minutes, seconds = map(int, parts)
            return minutes * 60000 + seconds * 1000
    except ValueError:
        return None
    return None

def escape_sql(s):
    if s:
        return s.replace("'", "''")
    return ''

def generate_sql(csv_path, race_name, event_date, race_type='triathlon'):
    race_date = datetime.strptime(event_date, '%Y-%m-%d').date()
    
    swim_dist = '750m'
    bike_dist = '20km'
    run_dist = '5km'
    
    person_inserts = []
    race_inserts = []
    seen_people = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            bib = row.get('Bib', '').strip()
            name = row.get('Name', '').strip()
            
            if not bib or not name:
                continue
            
            if bib == '63' and name == '':
                continue
                
            if bib in seen_people:
                person_id = seen_people[bib]
            else:
                person_id = f"P{bib.zfill(4)}"
                seen_people[bib] = person_id
                
                team = row.get('Team Name', '').strip()
                city = row.get('City', '').strip()
                
                team_val = f"'{escape_sql(team)}'" if team else 'NULL'
                city_val = f"'{escape_sql(city)}'" if city else 'NULL'
                
                person_inserts.append(
                    f"INSERT INTO person_ids (external_id, name, team_name, city) VALUES "
                    f"('{bib}', '{escape_sql(name)}', {team_val}, {city_val});"
                )
            
            chip_elapsed = row.get('Chip Elapsed', '').strip()
            if chip_elapsed == 'DQ' or not chip_elapsed:
                continue
            
            total_time_ms = parse_time_to_ms(chip_elapsed)
            if total_time_ms is None:
                continue
            
            swim_time = parse_time_to_ms(row.get('Swim', '').strip())
            t1_time = parse_time_to_ms(row.get('T1', '').strip())
            bike_time = parse_time_to_ms(row.get('Bike', '').strip())
            t2_time = parse_time_to_ms(row.get('T2', '').strip())
            run_time = parse_time_to_ms(row.get('Run', '').strip())
            
            age = row.get('Age', '').strip()
            gender = row.get('Gender', '').strip()
            
            age_group = None
            if age and gender:
                try:
                    age_int = int(age)
                    age_group = f"{gender}{age_int}"
                except ValueError:
                    pass
            
            swim_val = str(swim_time) if swim_time else 'NULL'
            t1_val = str(t1_time) if t1_time else 'NULL'
            bike_val = str(bike_time) if bike_time else 'NULL'
            t2_val = str(t2_time) if t2_time else 'NULL'
            run_val = str(run_time) if run_time else 'NULL'
            age_group_val = f"'{age_group}'" if age_group else 'NULL'
            gender_val = f"'{gender}'" if gender else 'NULL'
            
            race_inserts.append(
                f"INSERT INTO race_results (person_id, race_type, race_name, distance, time_ms, event_date, "
                f"age_group, gender, swim_distance, bike_distance, run_distance, "
                f"swim_time_ms, transition1_time_ms, bike_time_ms, transition2_time_ms, run_time_ms) VALUES "
                f"('{person_id}', '{race_type}', '{race_name}', '25.75km', {total_time_ms}, '{race_date}', "
                f"{age_group_val}, {gender_val}, "
                f"'{swim_dist}', '{bike_dist}', '{run_dist}', "
                f"{swim_val}, {t1_val}, {bike_val}, {t2_val}, {run_val});"
            )
    
    return person_inserts, race_inserts

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: import_race_results.py <csv_path> <race_name> <event_date>")
        print("Example: import_race_results.py ../resu/tree.csv 'Stanford Treeathlon 2026' '2026-03-15'")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    race_name = sys.argv[2]
    event_date = sys.argv[3]
    
    person_inserts, race_inserts = generate_sql(csv_path, race_name, event_date)
    
    print("-- Person ID mappings")
    for insert in person_inserts:
        print(insert)
    
    print("\n-- Race results")
    for insert in race_inserts:
        print(insert)
    
    print(f"\n-- Total: {len(person_inserts)} people, {len(race_inserts)} race results")