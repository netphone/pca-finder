FROM python:3.6

COPY . ./models

RUN pip install -r ./models/requirements.txt

# CMD ["python3", "./models/pcad.py"]

RUN chown -R www-data:www-data .

# change to the www-data user
USER www-data

EXPOSE 5000
