/**
 * ======================================================
 * V39.1 Enterprise
 * Dispatch Guard Engine
 * ======================================================
 */

const ORDER_COL = {

  ORDER_NO : 2,

  DATE : 8,

  START : 9,

  END : 10,

  DRIVER : 26,

  CUSTOMER : 6

};

/**
 * 判斷是否時間重疊
 */
function isOverlap_(aStart,aEnd,bStart,bEnd){

  return (
      aStart < bEnd &&
      aEnd > bStart
  );

}

/**
 * 日期＋時間
 */
function buildDateTime_(date,time){

    return new Date(
        date + " " + time
    );

}

/**
 * 真正檢查司機衝突
 */
function checkDriverConflict_(
    sheet,
    driver,
    date,
    startTime,
    endTime
){

    const values =
        sheet.getDataRange().getValues();

    const conflicts=[];

    const newStart=
        buildDateTime_(date,startTime);

    const newEnd=
        buildDateTime_(date,endTime);

    for(let r=1;r<values.length;r++){

        const row=values[r];

        if(row[ORDER_COL.DRIVER-1]!=driver)
            continue;

        if(String(row[ORDER_COL.DATE-1])!=String(date))
            continue;

        const oldStart=
            buildDateTime_(
                row[ORDER_COL.DATE-1],
                row[ORDER_COL.START-1]
            );

        const oldEnd=
            buildDateTime_(
                row[ORDER_COL.DATE-1],
                row[ORDER_COL.END-1]
            );

        if(
            isOverlap_(
                newStart,
                newEnd,
                oldStart,
                oldEnd
            )
        ){

            conflicts.push({

                row:r+1,

                orderNo:row[ORDER_COL.ORDER_NO-1],

                customer:row[ORDER_COL.CUSTOMER-1],

                start:row[ORDER_COL.START-1],

                end:row[ORDER_COL.END-1]

            });

        }

    }

    return conflicts;

}
