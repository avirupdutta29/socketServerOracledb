export const hrPool = {
    user: 'system',
    password: 'Oracle123',
    connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.17.0.2)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=SEPDB)(SERVER=DEDICATED)(SID=prod1)))",
    poolMin: 10,
    poolMax: 10,
    poolIncrement: 0
};