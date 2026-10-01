-- Equipment catalogue rows (D-035: reference data lives in a migration so every environment has it).
-- Every capability token is provided by at least one item (pgTAP-tested). Names follow docs/design/Equipment.html.
insert into public.equipment_catalog (id, name, category, capabilities, weight_kind) values
  -- Free weights
  ('dumbbells-adjustable', 'Adjustable dumbbells',        'free-weights',    '{dumbbell}',           'range'),
  ('dumbbells-fixed',      'Dumbbells (fixed pairs)',     'free-weights',    '{dumbbell}',           'list'),
  ('kettlebells',          'Kettlebells',                 'free-weights',    '{kettlebell}',         'list'),
  ('barbell-olympic',      'Olympic barbell',             'free-weights',    '{barbell}',            'list'),
  ('barbell-standard',     'Standard barbell',            'free-weights',    '{barbell}',            'list'),
  ('ez-bar',               'EZ curl bar',                 'free-weights',    '{ez-bar}',             'list'),
  ('trap-bar',             'Trap / hex bar',              'free-weights',    '{trap-bar}',           'list'),
  ('plates',               'Weight plates',               'free-weights',    '{plate}',              'list'),
  ('med-ball',             'Medicine ball',               'free-weights',    '{med-ball}',           'list'),
  -- Racks, benches & bars
  ('squat-rack',           'Squat rack with safeties',    'racks-benches',   '{rack}',               'none'),
  ('power-rack',           'Power rack with pull-up bar', 'racks-benches',   '{rack,pull-up-bar}',   'none'),
  ('bench-adjustable',     'Adjustable bench',            'racks-benches',   '{bench}',              'none'),
  ('bench-flat',           'Flat bench',                  'racks-benches',   '{bench}',              'none'),
  ('pull-up-bar',          'Pull-up bar',                 'racks-benches',   '{pull-up-bar}',        'none'),
  ('dip-station',          'Dip station',                 'racks-benches',   '{dip-station}',        'none'),
  ('landmine',             'Landmine attachment',         'racks-benches',   '{landmine}',           'none'),
  ('plyo-box',             'Plyo box or step',            'racks-benches',   '{box}',                'none'),
  -- Machines & cables
  ('cable-machine',        'Cable machine',               'machines-cables', '{pulley}',             'none'),
  ('functional-trainer',   'Functional trainer',          'machines-cables', '{pulley}',             'none'),
  ('smith-machine',        'Smith machine',               'machines-cables', '{smith}',              'none'),
  ('leg-press',            'Leg press',                   'machines-cables', '{machine}',            'none'),
  ('weight-machines',      'Weight machines (pin-loaded)', 'machines-cables', '{machine}',           'none'),
  ('sled',                 'Sled',                        'machines-cables', '{sled}',               'none'),
  -- Cardio
  ('rower',                'Rowing machine',              'cardio',          '{rower}',              'none'),
  ('bike',                 'Exercise or air bike',        'cardio',          '{bike}',               'none'),
  ('treadmill',            'Treadmill',                   'cardio',          '{treadmill}',          'none'),
  ('skipping-rope',        'Skipping rope',               'cardio',          '{rope}',               'none'),
  ('battle-ropes',         'Battle ropes',                'cardio',          '{rope}',               'none'),
  ('stairs',               'Stairs',                      'cardio',          '{stairs}',             'none'),
  -- Bodyweight
  ('rings',                'Gymnastic rings',             'bodyweight',      '{rings}',              'none'),
  ('suspension-trainer',   'Suspension trainer (TRX)',    'bodyweight',      '{trx}',                'none'),
  ('ab-wheel',             'Ab wheel',                    'bodyweight',      '{ab-wheel}',           'none'),
  -- Accessories
  ('resistance-bands',     'Resistance bands',            'accessories',     '{band}',               'none'),
  ('foam-roller',          'Foam roller',                 'accessories',     '{foam-roller}',        'none');
