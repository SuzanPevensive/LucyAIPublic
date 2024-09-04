const { jsPDF } = window.jspdf;

const pdfSettings = {
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
}

const pdfColumnStyles = [
    {cellWidth: 26},
    {},
    {cellWidth: 28, halign: 'center'},
    {cellWidth: 30, halign: 'right'},
    {cellWidth: 28, halign: 'right'},
    {cellWidth: 40, halign: 'right'},
];

const pdfPageMargins = {top: 10, right: 10, bottom: 20, left: 10}
const pdfCellHeight = [12, 5];  // 0: with images, 1: without images
const pdfFontSize = [10, 7];    // 0: with images, 1: without images
const pdfInfoFontSize = 7;
const pdfPageNrFontSize = 11;
const imageMarginY = 1;

function onChangeRenderImages( event, messageText ) {
    /** @type {HTMLInputElement} */
    let checkBox = event.target;

    if( checkBox.type !== 'checkbox' ) {
        console.error('Invalid input type (must be a "checkbox"): ', event.target);
        return false;
    }

    if( checkBox.checked ) {
        checkBox.checked = confirm( messageText );
    }
}

function saveTableAsPDF( targetId, renderImages = false ) {
    /** @type {HTMLTableElement|null} */
    let tableContainer;

    if (typeof targetId !== 'string' || (tableContainer = document.getElementById(targetId)) === null || tableContainer.tagName !== 'TABLE') {
        console.error('Invalid targetId: (must be a valid table id)', targetId);
        return false;
    }

    /** @type {HTMLDivElement} */
    let overlayElement = document.createElement('div');
    overlayElement.id = 'said_plugins_reports_data_table_overlay';
    document.body.prepend(overlayElement);

    /** @type {HTMLDivElement} */
    let loaderElement = document.createElement('div');
    loaderElement.id = 'said_plugins_reports_data_table_loader';
    loaderElement.style.backgroundImage = 'url("/wp-admin/images/spinner-2x.gif")';
    document.body.prepend(loaderElement);

    let imageColumns = [];

    for (let image of tableContainer.querySelectorAll('img')) {
        let currentCellIndex = image.closest('td').cellIndex;

        if (!imageColumns.includes(currentCellIndex)) imageColumns.push(currentCellIndex);
    }

    let customColumnStyles = JSON.parse(JSON.stringify(pdfColumnStyles));

    let tableColumnsToRenderCount = tableContainer.rows[0].cells.length;

    /** @type {HTMLStyleElement} */
    let hideImgStyle = document.createElement('style');
    hideImgStyle.id = 'said_plugins_reports_data_table_hideImg';

    if (!renderImages) {
        for (let imageColumn of imageColumns) {
            customColumnStyles.splice(imageColumn, 1);
            tableColumnsToRenderCount--;
            hideImgStyle.textContent += '#said_plugins_reports_data_table tr > th:nth-child(' + (imageColumn + 1) + '), #said_plugins_reports_data_table tr > td:nth-child(' + (imageColumn + 1) + ') { display: none; } ';
        }
        document.head.append(hideImgStyle);
    }

    let reportsPdf = new jsPDF(pdfSettings);

    let cellHeight = renderImages ? pdfCellHeight[0] : pdfCellHeight[1];
    let imageHeight = cellHeight - imageMarginY * 2;

    setTimeout(() => {
        reportsPdf.autoTable({
            html: tableContainer,
            useCss: false,
            margin: pdfPageMargins,
            showFoot: 'everyPage',
            rowPageBreak: 'avoid',
            styles: {
                minCellHeight: cellHeight,
                valign: 'middle',
                font: 'Verdana',
                fontSize: renderImages ? pdfFontSize[0] : pdfFontSize[1],
            },
            columnStyles: customColumnStyles,
            didParseCell: function (data) {
                if (data.cell.section === 'head') {
                    data.cell.styles = {
                        ...data.cell.styles,
                        ...customColumnStyles[data.column.index]
                    }
                }
            },
            didDrawCell: function (data) {
                if (renderImages && imageColumns.includes(data.column.index) && data.cell.section === 'body') {
                    /** @type {HTMLImageElement|undefined} */
                    let img = data.cell.raw.getElementsByTagName('img')[0];

                    if (img !== undefined) {
                        let ratio = img.offsetWidth / img.offsetHeight;
                        let imageWidth = imageHeight * ratio;
                        let imagePositionX = data.cell.x + data.cell.width / 2 - imageWidth / 2;
                        let imagePositionY = data.cell.y + data.cell.height / 2 - imageHeight / 2;

                        reportsPdf.addImage(img.src, 'JPEG', imagePositionX, imagePositionY, imageWidth, imageHeight, img.src, 'SLOW', 0);
                    }
                }
            },
        });

        let currentDate = new Date();
        let currentDateForFilename =
            currentDate.getDate() + '-' +
            currentDate.getMonth() + '-' +
            currentDate.getFullYear() + '_' +
            currentDate.getHours() + '-' +
            currentDate.getMinutes();

        for (let i = 1; i <= reportsPdf.internal.getNumberOfPages(); i++) {
            reportsPdf.setPage(i);
            reportsPdf.setFont('Verdana', 'normal');
            reportsPdf.setFontSize(pdfInfoFontSize);
            reportsPdf.text(
                document.getElementById('said_plugins_reports_info_count').textContent,
                pdfPageMargins.left,
                reportsPdf.internal.pageSize.height - 14,
                {align: 'left'}
            );
            reportsPdf.text(
                document.getElementById('said_plugins_reports_info_phrase').textContent,
                pdfPageMargins.left + 45,
                reportsPdf.internal.pageSize.height - 14,
                {align: 'left'}
            );
            reportsPdf.text(
                document.getElementById('said_plugins_reports_info_from').textContent,
                pdfPageMargins.left,
                reportsPdf.internal.pageSize.height - 10,
                {align: 'left'}
            );
            reportsPdf.text(
                document.getElementById('said_plugins_reports_info_to').textContent,
                pdfPageMargins.left + 45,
                reportsPdf.internal.pageSize.height - 10,
                {align: 'left'}
            );
            reportsPdf.text(
                currentDateForFilename,
                reportsPdf.internal.pageSize.width - pdfPageMargins.right,
                reportsPdf.internal.pageSize.height - 12,
                {align: 'right'}
            );
            reportsPdf.setFontSize(pdfPageNrFontSize);
            reportsPdf.text(
                i + ' / ' + reportsPdf.internal.getNumberOfPages(),
                reportsPdf.internal.pageSize.width / 2,
                reportsPdf.internal.pageSize.height - 10,
                {align: 'center'}
            );
        }

        reportsPdf.save('Product Report (' + currentDateForFilename + ').pdf', {returnPromise: true}).then(() => {
            if( !renderImages ) {
                hideImgStyle.remove();
            }
            overlayElement.remove();
            loaderElement.remove();
        });
    }, 100);
}

document.addEventListener("DOMContentLoaded", () => {
    /** @type {HTMLInputElement} */
    let reportsSearchDateFrom = document.getElementById('said_plugins_reports_search_date_from'),
        reportsSearchDateTo = document.getElementById('said_plugins_reports_search_date_to');

    reportsSearchDateTo.max = new Date().toISOString().split('T')[0];

    let updateConstraints = function() {
        reportsSearchDateFrom.max = reportsSearchDateTo.value.trim() || reportsSearchDateTo.max;
        reportsSearchDateTo.min = reportsSearchDateFrom.value.trim() || reportsSearchDateFrom.min;
    };

    updateConstraints();

    reportsSearchDateFrom.addEventListener('change', updateConstraints);
    reportsSearchDateTo.addEventListener('change', updateConstraints);
});