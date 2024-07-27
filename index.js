import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';


import fs from 'fs';

import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.listen(3000, () => {
    console.log("Server listen port http://localhost:3000");
});

//MIDDLEWARE 
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors());
app.use(morgan('tiny'));

app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "./public/index.html"));
});


//ROOMMATES

app.get("/roommates", (req, res) => {
    try {
        let roommates = fs.readFileSync(path.resolve(__dirname, './data/roommates.json'), 'utf-8');
        roommates = JSON.parse(roommates);
        res.json({
            roommates
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: "No se puede acceder a datos de roommates"
        });
    }
});


app.post("/roommate", async (req, res) => {
    try {
        let { data } = await axios.get('https://randomuser.me/api');

        let dataApi = data.results[0]

        let nuevoRoommate = {
            id: uuidv4().slice(0, 6),
            nombre: `${dataApi.name.first} ${dataApi.name.last}`,
            debe: 0,
            recibe: 0
        }

        //leer roommates

        let roommates = fs.readFileSync(path.resolve(__dirname, './data/roommates.json'), 'utf-8');
        roommates = JSON.parse(roommates);

        //guardar roommates
        roommates.push(nuevoRoommate);

        fs.writeFileSync(path.resolve(__dirname, './data/roommates.json'), JSON.stringify(roommates, null, 4), 'utf-8');

        res.status(201).json({
            msg: "Datos roommates cargados correctamente"
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: "Error al intentar cargar datos a roommate"
        });
    }
});

//GASTOS

app.get("/gastos", (req, res) => {
    try {
        let gastos = fs.readFileSync(path.resolve(__dirname, './data/gastos.json'), 'utf-8');
        gastos = JSON.parse(gastos);
        res.json({
            gastos
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: "No se puede acceder a datos de gatos"
        });
    }
});

app.post("/gasto", (req, res) => {
    try {

        let { roommate, descripcion, monto } = req.body;
      
        if(!roommate || !descripcion || !monto){
            return res.status(400).json({
                msg:"Debe enviar los datos requeridos"
            })
        }

        let gastos = fs.readFileSync(path.resolve(__dirname, './data/gastos.json'), 'utf-8');
        gastos = JSON.parse(gastos);

        
        let gastoNuevo = {
            id: uuidv4().slice(0, 6),
            roommate,
            descripcion,
            monto,
        };

        gastos.push(gastoNuevo);

        fs.writeFileSync(path.resolve(__dirname, './data/gastos.json'), JSON.stringify(gastos, null, 4), 'utf-8');

            res.status(201).json({
            gastos
        });

        calcularGastos();

    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: "Error al intentar cargar datos a gasto"
        });
    }
});

//delete gasto

app.delete("/gasto/:id", (req, res) => {
    try {

        let {id }=req.params;

        
        if(!id){
            return res.status(400).json({
                msg:"Debe proporcionar dato requerido"
            })
        }

        let gastos = fs.readFileSync(path.resolve(__dirname,"./data/gastos.json"),'utf-8');

        gastos = JSON.parse(gastos);

        let indexGasto = gastos.findIndex(gasto =>gasto.id == id);

        if(indexGasto < 0){
            return res.status(404).json({
                msg:"Gasto no encontrado"
            })
        };

        gastos.splice(indexGasto, 1);

        fs.writeFileSync(path.resolve(__dirname, './data/gastos.json'), JSON.stringify(gastos, null, 4), 'utf-8');
        calcularGastos();

        res.json({
            msg:"ok",
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: "No se puede acceder a datos de gatos"
        });
    }
});

//update gasto

app.put("/gasto", async(req,res)=>{
    try {
        let { roommate, descripcion, monto } = req.body;
        let {id}=req.query;

        if(!roommate || !descripcion || !monto || !id){
            return res.status(400).json({
                msg:"Se deben proporcionar los datos para realizar cambios"
            })
        };

        let gastos = fs.readFileSync(path.resolve(__dirname,"./data/gastos.json"),'utf-8');
        gastos = JSON.parse(gastos);

        let searchGasto = gastos.find(gasto => gasto.id == id);

        if(!searchGasto){
            res.status(404).json({
                msg:"Gasto no encontrado"
            })
        };

        searchGasto.roommate = roommate;
        searchGasto.descripcion = descripcion;
        searchGasto.monto = monto;

        fs.writeFileSync(path.resolve(__dirname, './data/gastos.json'), JSON.stringify(gastos, null, 4), 'utf-8');
        calcularGastos();
        
        res.status(201).json({
            gastos
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: "No se puede acceder a datos de gatos"
        });
    }
});

//limpiar deuda

const deleteDeuda = async()=>{
    try {
        let arrayRoommates = fs.readFileSync(path.resolve(__dirname, "./data/roommates.json"),'utf-8');
        arrayRoommates = JSON.parse(arrayRoommates);

        for (const roommate of arrayRoommates) {
            roommate.debe = 0;
            roommate.recibe = 0;
        };

        fs.writeFileSync(path.resolve(__dirname, './data/roommates.json'), JSON.stringify(arrayRoommates, null, 4), 'utf-8');
    } catch (error) {
        console.log(error);
    }
}

//calcular gastos 

const calcularGastos = async ()=>{
    deleteDeuda();
    try {
        let arrayGastos = fs.readFileSync(path.resolve(__dirname, "./data/gastos.json"),'utf-8');
        arrayGastos = JSON.parse(arrayGastos);

        let arrayRoommates = fs.readFileSync(path.resolve(__dirname, "./data/roommates.json"),'utf-8');
        arrayRoommates = JSON.parse(arrayRoommates);

       for (const gasto of arrayGastos) {
            let monto = Number(gasto.monto);
            let cuota = Number((monto / arrayRoommates.length).toFixed(2));
             for (const roommate of arrayRoommates) {
                if(gasto.roommate == roommate.nombre){
                    roommate.recibe += monto - cuota;
                }else{
                    roommate.debe += cuota;
                }
             }
       };

       fs.writeFileSync(path.resolve(__dirname, './data/roommates.json'), JSON.stringify(arrayRoommates, null, 4), 'utf-8');
     
    } catch (error) {
        console.log(error);
    }
};

