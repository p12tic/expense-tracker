# Running the project

## Backend

Go to project's root directory and run the following command:
```commandline
python manage.py runserver
```

## Frontend

Go to ```expense_tracker_frontend``` directory and run the following command:
```commandline
npm run dev
```

## Apscheduler

Apscheduler uses AI to extract data from images added when creating transaction batch.  
To run apscheduler, go to project's root directory and run the following command:
```commandline
python manage.py run_scheduler
```

## Syntetic data

to get syntetic data for testing you can use syntetic_data_generator and it's flags.
```commandline
python manage.py syntetic_data_generator
```