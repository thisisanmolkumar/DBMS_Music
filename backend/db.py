from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from crud import *

uri = "mongodb+srv://mckyzcky:Cheeseypizza5@dbms-music.w0mdxqw.mongodb.net/?appName=DBMS-Music"

client = MongoClient(uri, server_api=ServerApi('1'))

try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

db = client["Music"]

ensure_indexes(db)
